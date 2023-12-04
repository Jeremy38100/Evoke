import { CSSProperties, useEffect, useState } from 'react'
import { Game, GameStatus, ImageCard, Player } from '../models/model'
import { COLORS } from '../utils/imagesUtils'

export interface ChoseImageOpts {
    image: ImageCard,
    player: Player
}

export interface ImagesGridProps {
    gameData: Game,
    myPlayer: Player
    choseImage: (opts: ChoseImageOpts) => void,
    hintCard: (image: ImageCard) => void
}
function ImagesGrid({ gameData, myPlayer, choseImage, hintCard }: ImagesGridProps) {

    // Use -1 to disable modal, imageIndex in gameData.images otherwise
    const [modalImageIndex, setModalImageIndex] = useState(-1)

    useEffect(() => {
        const handleEscapeKey = ({ key }: KeyboardEvent) => {
            const incrementImageArray = (inc: number) => setModalImageIndex(prev => (prev + inc + gameData.images.length) % gameData.images.length)
            if (key === 'Escape') setModalImageIndex(-1)
            else if (key == 'ArrowRight') incrementImageArray(1)
            else if (key == 'ArrowLeft') incrementImageArray(-1)
        }
        window.addEventListener('keydown', handleEscapeKey)
        return () => {
            window.removeEventListener('keydown', handleEscapeKey)
        }
    }, [gameData])

    const getColorImage = ({ imageTeam, flippedByTeam, isHint }: ImageCard) => {
        if (isHint) return COLORS.HINT // Everyone can see the hint

        const isColorVisibleByPlayer = myPlayer.isGameMaster || flippedByTeam || gameData.gameStatus == GameStatus.ENDED
        if (!isColorVisibleByPlayer) return 'transparent'

        if (imageTeam == 'teamBlue') return COLORS.BLUE
        if (imageTeam == 'teamRed') return COLORS.RED
        if (imageTeam == 'neutral') return COLORS.NEUTRAL
        return COLORS.DEAD
    }

    const getFilterImage = (image: ImageCard) => {
        if (gameData.gameStatus == GameStatus.ENDED) return ''
        if (image.flippedByTeam) return 'grayscale(100%)'
        return ''
    }

    const modalImage = modalImageIndex < 0 ? undefined : gameData.images[modalImageIndex]

    const isButtonVisible = (image: ImageCard) =>
        gameData.gameStatus == GameStatus.RUNNING &&
        image.flippedByTeam == '' &&
        !myPlayer.isGameMaster &&
        gameData.teamPlaying === myPlayer.teamId

    const styles: Record<string, CSSProperties> = {
        // TODO: rework this to adapt row/col grid layout
        gridContainer: {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            width: 'min(95vh, 95vw)',
            height: 'min(95vh, 95vw)',
        },
        gridItem: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: 8,
            flexDirection: 'column',
        },
        img: {
            borderRadius: 6,
            width: 'calc(100% - 2rem)',
            maxWidth: '100%',
            height: 'auto',
        },
        containerButtons: {
            width: 'calc(100% - 2rem)',
            borderRadius: 6,
        },
        button: {
            padding: '.1em .6em',
            margin: 0
        }
    };

    return (
        <>
            {/* TODO: Move into dedicated component */}
            {modalImage && <div className="modal-overlay">
                <div className="modal" style={{ backgroundColor: getColorImage(modalImage) }}>
                    <button className="close-button" onClick={() => setModalImageIndex(-1)}>
                        Close
                    </button>
                    <img src={`/images/${modalImage.imageId}`} alt="Modal" className="modal-image" />
                </div>
            </div>}
            <div style={styles.gridContainer}>
                {gameData.images.map((image, index) => (
                    <div key={index} style={styles.gridItem} >
                        <img
                            alt={`image-${index}`}
                            onClick={() => setModalImageIndex(index)}
                            key={image.imageId}
                            style={{ ...styles.img, filter: getFilterImage(image) }}
                            src={`/images/${image.imageId}`} />
                        <div className='flex-container-center' style={{ ...styles.containerButtons, backgroundColor: getColorImage(image) }}>
                            {isButtonVisible(image) &&
                                <button style={styles.button} onClick={() => hintCard(image)} >🤔</button>
                            }

                            <span style={{ margin: '0 .8em' }}>{index}</span>

                            {isButtonVisible(image) &&
                                <button style={styles.button} onClick={() => choseImage({ image, player: myPlayer })} >👌</button>
                            }
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}

export default ImagesGrid