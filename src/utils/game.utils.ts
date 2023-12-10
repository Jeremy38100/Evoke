import { Game, ImageCard, TeamId } from "../models/model"


/**
 * Returns the ID of the other team.
 * @param team The ID of the current team.
 * @returns The ID of the other team.
 */
export const getOtherTeam = (team: TeamId): TeamId => {
  if (team === 'teamBlue') return 'teamRed'
  return 'teamBlue'
}

/**
 * Calculates the number of remaining images for a specific team.
 *
 * @param images - The collection of image cards.
 * @param teamId - The ID of the team.
 * @returns The number of remaining images for the team.
 */
export const getRemainingNbImagesForTeam = (images: Record<string, ImageCard>, teamId: TeamId): number => {
  return Object.values(images).filter(i => i.imageTeam === teamId && i.flippedByTeam === '').length
}


/**
 * Retrieves the image with the specified imageId from the given images Record.
 * Throws an error if the image is not found.
 *
 * @param images - The Record containing the images.
 * @param imageId - The ID of the image to retrieve.
 * @returns The image card with the specified imageId.
 * @throws Error if the image is not found.
 */
export const getImage = (images: Record<string, ImageCard>, imageId: string): ImageCard => {
  if (!images[imageId]) throw Error('Can not find image: ' + imageId)
  return images[imageId]
}

/**
 * Disables the hint for all images in the game.
 *
 * @param game - The game object.
 * @returns The updated game object with disabled hint for all images.
 */
export const disableAllImagesHint = (game: Game): Game => {
  Object.values(game.images).forEach(i => i.isHint = false)
  return game
}