export const shareAction = (fileBlob: Blob): Promise<void> => {
  const navigatorHack: Navigator = window.navigator
  const fileToShare = new File([fileBlob], 'image', {
    type: 'image/jpeg',
  })
  return navigatorHack.share({ files: [fileToShare] })
}
