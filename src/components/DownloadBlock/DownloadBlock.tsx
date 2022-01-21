import { useState, useEffect, MouseEvent, useRef } from 'react'
import { shareAction } from './utils'
import { DownloadBlockProps } from './types'
import { ReactComponent as DownloadIcon } from '../../static/icons/downloadIcon.svg'
import { ReactComponent as ShareIcon } from '../../static/icons/shareIcon.svg'

const DownloadBlock = (props: DownloadBlockProps): JSX.Element => {
  const [canIShareFile, setCanIShareFile] = useState<boolean>(false)
  const downloadButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const navigatorHack: Navigator = window.navigator
    if (
      navigatorHack &&
      typeof navigatorHack.canShare !== 'undefined' &&
      navigatorHack.canShare()
    ) {
      setCanIShareFile(true)
    }
  }, [])

  useEffect(() => {
    downloadButtonRef.current?.focus()
  }, [])

  const shareImage = () =>
    fetch(props.file.imageBase64)
      .then((response) => response.blob())
      .then((imageBlob) => {
        if (canIShareFile) {
          shareAction(imageBlob)
            .then(() => console.log('Share was successful.'))
            .catch(console.error)
        } else {
          const imageURL = URL.createObjectURL(imageBlob)
          const link = document.createElement('a')
          link.href = imageURL
          link.download = new Date().toLocaleDateString()
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      })
  const mouseClickHandler = async (event: MouseEvent) => {
    event?.preventDefault()
    return await shareImage()
  }

  const hrefClickHandler = async () => await shareImage()

  if (!props.file) {
    return (
      <small className='form-text'>
        Error: cannot read the file. Please try again.
      </small>
    )
  }
  return (
    <>
      <div className='d-flex flex-wrap align-content-center align-items-center justify-content-center'>
        <button
          type='button'
          className='btn btn-light btn-lg col-12 offset-sm-1 col-sm-5'
          onClick={mouseClickHandler}
          ref={downloadButtonRef}
        >
          {canIShareFile ? (
            <>
              <ShareIcon /> share
            </>
          ) : (
            <>
              <DownloadIcon /> download
            </>
          )}
        </button>
        <a
          onClick={hrefClickHandler}
          download={props.file.imageBase64}
          className='mt-2'
          type='image/jpeg'
          href='#download'
        >
          <img src={props.file.imageBase64} className='img-thumbnail' alt='' />
        </a>
      </div>
    </>
  )
}

export default DownloadBlock
