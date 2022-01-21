export const shareAction = (
  fileBlob: Blob,
  name: string = 'image',
  type: string = ''
): Promise<void> => {
  const navigatorHack: Navigator = window.navigator
  const fileToShare = new File([fileBlob], name, {
    type: type,
  })
  return navigatorHack.share({ files: [fileToShare] })
}
