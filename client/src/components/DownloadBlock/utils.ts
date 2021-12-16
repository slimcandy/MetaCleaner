import { IMetaFileInfo } from '../App/types'

export const shareAction = (file: IMetaFileInfo): Promise<void> => {
  const navigatorHack: Navigator = window.navigator
  return fetch(file.link)
    .then((response) => response.blob())
    .then((fileBlob) => {
      const fileToShare = new File([fileBlob], file.name, {
        type: file.mimetype,
      })
      return navigatorHack.share({ files: [fileToShare] })
    })
    .catch(console.error)
}
