import { CSSProperties, useEffect, useMemo, useState } from 'react'
import { useGameContext } from '../context/GameContext'
import { COLORS } from '../utils/images.utils'
import { getImage } from '../utils/game.utils'

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
        const { imageTeam, flippedByTeam, isHint } = getImage(images, imageId)
        if (isHint) return COLORS.HINT // Everyone can see the hint

        const isColorVisibleByPlayer = myPlayer?.isGameMaster || flippedByTeam || gameStatus === 'finished'
        if (!isColorVisibleByPlayer) return 'transparent'

        if (imageTeam === 'teamBlue') return COLORS.BLUE
        if (imageTeam === 'teamRed') return COLORS.RED
        if (imageTeam === 'neutral') return COLORS.NEUTRAL
        return COLORS.DEAD
    }

    const getFilterImage = (imageId: string) => {
        if (gameStatus === 'finished') return ''
        if (getImage(images, imageId).flippedByTeam) return 'grayscale(100%)'
        return ''
    }

    const modalImage = modalImageIndex < 0 ? undefined : Object.values(images).find(({ index }) => index === modalImageIndex)

    const isButtonVisible = (imageId: string) => {
        const { flippedByTeam } = getImage(images, imageId)
        return gameStatus === 'playing' &&
            flippedByTeam === '' &&
            !myPlayer?.isGameMaster &&
            teamPlaying === myPlayer?.teamId
    }

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

    const imagesArr = useMemo(() => Object.values(images).sort((a, b) => a.index - b.index), [images])

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
            <div style={styles.gridContainer}>
                {imagesArr.map(({ imageId, index }) => (
                    <div key={index} style={styles.gridItem} >
                        <img
                            alt={`image-${index}`}
                            onClick={() => setModalImageIndex(index)}
                            key={imageId}
                            style={{ ...styles.img, filter: getFilterImage(imageId) }}
                            src={`/images/${imageId}`} />
                        <div className='flex-container-center' style={{ ...styles.containerButtons, backgroundColor: getColorImage(imageId) }}>
                            {isButtonVisible(imageId) &&
                                <button style={styles.button} onClick={() => hintCard({ imageId, player: myPlayer })} >🤔</button>
                            }

                            <span style={{ margin: '0 .8em' }}>{index}</span>

                            {isButtonVisible(imageId) &&
                                <button style={styles.button} onClick={() => choseCard({ imageId, player: myPlayer })} >👌</button>
                            }
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}

export default ImagesGrid