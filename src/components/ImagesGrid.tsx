import { chunk } from 'lodash'
import { CSSProperties, useEffect, useMemo, useState } from 'react'
import { ImageActionCb, useGameContext } from '../context/GameContext'
import { GameStatus, ImageCard, Player, TeamId } from '../models/model'
import { getImage } from '../utils/game.utils'
import { COLORS } from '../utils/images.utils'
import './ImageGrid.css'

const getColorImage = ({ imageTeam, isHint }: ImageCard) => {
    if (isHint) return COLORS.HINT
    if (imageTeam === 'teamBlue') return COLORS.BLUE
    if (imageTeam === 'teamRed') return COLORS.RED
    if (imageTeam === 'neutral') return COLORS.NEUTRAL
    return COLORS.DEAD
}

interface ImageCellProps {
    myPlayer: Player,
    image: ImageCard
    gameStatus: GameStatus
    teamPlaying: TeamId,
    hintCard: ImageActionCb,
    choseCard: ImageActionCb,
    setModalImageIndex: (index: number) => void,
}
function ImageCell({ myPlayer, image, gameStatus, teamPlaying, hintCard, choseCard, setModalImageIndex }: ImageCellProps) {

    const { isHint, flippedByTeam, imageTeam, index } = image

    const isButtonVisible = () => {
        return gameStatus === 'playing' &&
            flippedByTeam === '' &&
            !myPlayer?.isGameMaster &&
            teamPlaying === myPlayer?.teamId
    }

    const cellStyle = (): CSSProperties => {
        const isColorVisibleByPlayer = isHint || myPlayer?.isGameMaster || flippedByTeam || gameStatus === 'finished'
        if (!isColorVisibleByPlayer) return {}
        const style: CSSProperties = { background: getColorImage(image) }
        if (flippedByTeam) return { ...style, opacity: 0.5 }
        return style

    }

    const isCorrectFlip = () => flippedByTeam === imageTeam
    const isDead = () => imageTeam === 'dead'

    const hintCardWithMyPlayer = ({ imageId }: ImageCard) => hintCard({ imageId, player: myPlayer })
    const choseCardWithMyPlayer = ({ imageId }: ImageCard) => choseCard({ imageId, player: myPlayer })

    const getFlipText = () => {
        if (isCorrectFlip()) return '✅'
        if (isDead()) return '💀'
        return '❌'
    }

    return (
        <div className='cell' style={cellStyle()} >
            <div className='imgContainer'>
                <img alt={`image-${image.imageId}`}
                    className='img'
                    onClick={() => setModalImageIndex(index)}
                    src={`/images/${image.imageId}`}
                />
            </div>
            <div className='buttonsContainer'>
                {!flippedByTeam ? <>

                    {isButtonVisible() &&
                        <button className='img-button' onClick={() => hintCardWithMyPlayer(image)} >💡</button>
                    }

                    <span style={{ margin: '0 .8em' }}>{index}</span>

                    {isButtonVisible() &&
                        <button className='img-button' onClick={() => choseCardWithMyPlayer(image)} >👌</button>
                    }
                </> : <span>{getFlipText()}</span>}
            </div>

        </div>
    )
}


function ImagesGrid() {

    const {
        game: { images, gameStatus, teamPlaying },
        myPlayer,
        hintCard, choseCard
    } = useGameContext()

    // Use -1 to disable modal, imageIndex in gameData.images otherwise
    const [modalImageIndex, setModalImageIndex] = useState(-1)

    useEffect(() => {
        const handleEscapeKey = ({ key }: KeyboardEvent) => {
            const nbImages = Object.values(images).length
            const incrementImageArray = (inc: number) => setModalImageIndex(prev => (prev + inc + nbImages) % nbImages)
            if (key === 'Escape') setModalImageIndex(-1)
            else if (key === 'ArrowRight') incrementImageArray(1)
            else if (key === 'ArrowLeft') incrementImageArray(-1)
        }
        window.addEventListener('keydown', handleEscapeKey)
        return () => {
            window.removeEventListener('keydown', handleEscapeKey)
        }
    }, [images])

    const getColorImage = (imageId: string) => {
        // TODO: merge with other function
        const { imageTeam, flippedByTeam, isHint } = getImage(images, imageId)
        if (isHint) return COLORS.HINT // Everyone can see the hint

        const isColorVisibleByPlayer = myPlayer?.isGameMaster || flippedByTeam || gameStatus === 'finished'
        if (!isColorVisibleByPlayer) return 'transparent'

        if (imageTeam === 'teamBlue') return COLORS.BLUE
        if (imageTeam === 'teamRed') return COLORS.RED
        if (imageTeam === 'neutral') return COLORS.NEUTRAL
        return COLORS.DEAD
    }

    const modalImage = modalImageIndex < 0 ? undefined : Object.values(images).find(({ index }) => index === modalImageIndex)

    const imagesGrid = useMemo<ImageCard[][]>(() => {
        const sortedImages = Object.values(images).sort((a, b) => a.index - b.index)
        return chunk(sortedImages, Math.ceil(Math.sqrt(sortedImages.length)))
    }, [images])

    const imageCellProps = (image: ImageCard): ImageCellProps => ({
        choseCard,
        hintCard,
        gameStatus,
        teamPlaying,
        myPlayer,
        setModalImageIndex,
        image,
    })

    return (
        <>
            {/* TODO: Move into dedicated component */}
            {modalImage && <div className="modal-overlay">
                <div className="modal" style={{ backgroundColor: getColorImage(modalImage.imageId) }}>
                    <button className="close-button" onClick={() => setModalImageIndex(-1)}>
                        Close
                    </button>
                    <img src={`/images/${modalImage.imageId}`} alt="Modal" className="modal-image" />
                </div>
            </div>}
            <div id='grid-container'>
                <div id='grid' className='grid'>
                    {imagesGrid.map((imagesRow, rowIndex) => (
                        <div key={rowIndex} className='row'>
                            {imagesRow.map((image, colIndex) => (
                                <ImageCell key={rowIndex + '-' + colIndex} {...imageCellProps(image)} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}

export default ImagesGrid