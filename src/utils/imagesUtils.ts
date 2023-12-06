import { ImageCard } from "../models/model";
import images from '../assets/images.json'


/**
 * Shuffles the elements in an array and returns a new shuffled array.
 *
 * @param {Array} array - The input array to be shuffled.
 * @returns {Array} A new array containing the same elements as the input array but in a randomized order.
 */
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export const COLORS = {
    BLUE: '#7eb0d5',
    RED: '#fd7f6f',
    NEUTRAL: '#474747',
    DEAD: '#ffee65',
    HINT: '#568251',
}

export interface GetImagesOpts {
    nbRed: number,
    nbBlue: number,
    nbNeutral: number,
    nbDead: number
}

/**
 * Generates an array of ImageCard objects for a game based on the specified options.
 *
 * @param {GetImagesOpts} options - An object containing options for generating the image cards.
 * @returns {ImageCard[]} An array of ImageCard objects representing the game cards.
 */
export const getImages = ({ nbBlue, nbRed, nbNeutral, nbDead }: GetImagesOpts): ImageCard[] => {

    const defaultImageCard = (imageId: string): ImageCard => ({
        imageId,
        flippedByTeam: '',
        imageTeam: 'dead',
        isHint: false,
    })
    const nbCards = nbBlue + nbRed + nbNeutral + nbDead
    const imagesArr: ImageCard[] = shuffleArray(images)
        .slice(0, nbCards)
        .map(defaultImageCard)
    let index = 0
    for (let i = 0; i < nbBlue; i++) {
        imagesArr[index].imageTeam = 'teamBlue'
        index++
    }
    for (let i = 0; i < nbRed; i++) {
        imagesArr[index].imageTeam = 'teamRed'
        index++
    }
    for (let i = 0; i < nbNeutral; i++) {
        imagesArr[index].imageTeam = 'neutral'
        index++
    }
    return shuffleArray(imagesArr)
}