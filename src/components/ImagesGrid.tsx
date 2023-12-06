import { CSSProperties, useEffect, useState } from 'react'
import { useGameContext } from '../context/GameContext'
import { GameStatus, ImageCard } from '../models/model'
import { COLORS } from '../utils/imagesUtils'

function ImagesGrid() {

    const { game, getMyPlayer, hintCard, choseCard } = useGameContext()

    const myPlayer = getMyPlayer()!

    // Use -1 to disable modal, imageIndex in gameData.images otherwise
    const [modalImageIndex, setModalImageIndex] = useState(-1)

    useEffect(() => {
        const handleEscapeKey = ({ key }: KeyboardEvent) => {
            const incrementImageArray = (inc: number) => setModalImageIndex(prev => (prev + inc + game.images.length) % game.images.length)
            if (key === 'Escape') setModalImageIndex(-1)
            else if (key == 'ArrowRight') incrementImageArray(1)
            else if (key == 'ArrowLeft') incrementImageArray(-1)
        }
        window.addEventListener('keydown', handleEscapeKey)
        return () => {
            window.removeEventListener('keydown', handleEscapeKey)
        }
    }, [game])

    const getColorImage = ({ imageTeam, flippedByTeam, isHint }: ImageCard) => {
        if (isHint) return COLORS.HINT // Everyone can see the hint

        const isColorVisibleByPlayer = myPlayer.isGameMaster || flippedByTeam || game.gameStatus == GameStatus.ENDED
        if (!isColorVisibleByPlayer) return 'transparent'

        if (imageTeam == 'teamBlue') return COLORS.BLUE
        if (imageTeam == 'teamRed') return COLORS.RED
        if (imageTeam == 'neutral') return COLORS.NEUTRAL
        return COLORS.DEAD
    }

    const getFilterImage = (image: ImageCard) => {
        if (game.gameStatus == GameStatus.ENDED) return ''
        if (image.flippedByTeam) return 'grayscale(100%)'
        return ''
    }

    const modalImage = modalImageIndex < 0 ? undefined : game.images[modalImageIndex]

    const isButtonVisible = (image: ImageCard) =>
        game.gameStatus == GameStatus.RUNNING &&
        image.flippedByTeam == '' &&
        !myPlayer.isGameMaster &&
        game.teamPlaying === myPlayer.teamId

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
                {game.images.map((image, index) => (
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
                                <button style={styles.button} onClick={() => choseCard({ imageId: image.imageId, player: myPlayer })} >👌</button>
                            }
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}

export default ImagesGrid