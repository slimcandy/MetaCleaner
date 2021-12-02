import { useState, useEffect } from 'react'
import { IDownloadBlockProps } from './types'
import { IMetaData, IMetaFileInfo } from '../../appTypes'

const exifTitleMaxLength = 3

const downloadIcon = (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='16'
    height='16'
    fill='currentColor'
    className='bi bi-cloud-arrow-down-fill'
    viewBox='0 0 16 16'
  >
    <path d='M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 3.999 10.69 2 8 2zm2.354 6.854-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5a.5.5 0 0 1 1 0v3.793l1.146-1.147a.5.5 0 0 1 .708.708z' />
  </svg>
)

const shareIcon = (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='16'
    height='16'
    fill='currentColor'
    className='bi bi-box-arrow-up'
    viewBox='0 0 16 16'
  >
    <path
      fillRule='evenodd'
      d='M3.5 6a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 1 0-1h2A1.5 1.5 0 0 1 14 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-8A1.5 1.5 0 0 1 3.5 5h2a.5.5 0 0 1 0 1h-2z'
    />
    <path
      fillRule='evenodd'
      d='M7.646.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 1.707V10.5a.5.5 0 0 1-1 0V1.707L5.354 3.854a.5.5 0 1 1-.708-.708l3-3z'
    />
  </svg>
)

const parseTitleFromExifObject = (obj: IMetaData, limit = 3): string => {
  let resultString = ''
  const objLength = Object.keys(obj).length
  const objKeys = Object.keys(obj)

  if (objLength > limit) {
    const objShortKeys = objKeys.slice(0, limit)
    for (let i = 0; i < limit - 1; i++) {
      resultString += `${objShortKeys[i]}, `
    }
    resultString = resultString.replace(/,\s+$/, '')
    resultString += ` and ${objLength - limit + 1} more`
  } else {
    for (const key in obj) {
      resultString += `${key}, `
    }
    resultString = resultString.replace(/,\s+$/, '')
  }

  return resultString
}

const shareAction = (file: IMetaFileInfo): Promise<void> => {
  const navigatorHack: any = window.navigator
  return fetch(file.link)
    .then((response) => response.blob())
    .then((fileBlob) => {
      const fileToShare = new File([fileBlob], file.name, {
        type: file.mimetype,
      })
      return navigatorHack.share({ files: [fileToShare] })
    })
}

const DownloadBlock = (props: IDownloadBlockProps): JSX.Element => {
  const [canIShareFile, setCanIShareFile] = useState(false)
  useEffect(() => {
    const navigatorHack: any = window.navigator
    if (navigatorHack && navigatorHack.share && navigatorHack.canShare) {
      setCanIShareFile(true)
    }
  }, [])

  if (!props.data) {
    return (
      <small className='form-text'>
        Error: cannot read the file. Please try again.
      </small>
    )
  }

  const exifNumberBefore = Object.keys(props.data.before).length
  const exifMessageBefore = parseTitleFromExifObject(
    props.data.before,
    exifTitleMaxLength
  )
  const exifNumberAfter = Object.keys(props.data.after).length
  const fileInfo = props.data.file

  if (props.data.file.name === '') {
    return <small className='form-text'>Download link appears here.</small>
  }
  if (exifNumberBefore === 0) {
    return <small className='form-text'>File already has no meta tags.</small>
  }
  return (
    <>
      <div className='d-flex'>
        <a
          href={fileInfo.link}
          title={fileInfo.name}
          className={`btn btn-primary btn-lg ${
            canIShareFile ? 'col-8' : 'col-12'
          } ${props.loading ? 'disabled' : ''}`}
          type={fileInfo.mimetype}
          download
        >
          {props.loading ? (
            <>
              <span
                className='spinner-border spinner-border-sm mx-2'
                role='status'
                aria-hidden='true'
              ></span>
              Loading...
            </>
          ) : (
            <>{downloadIcon} Download</>
          )}
        </a>
        {canIShareFile && !props.loading && (
          <button
            type='button'
            className='btn btn-link col-4'
            onClick={() => shareAction(fileInfo)}
          >
            or {shareIcon} share
          </button>
        )}
      </div>
      {exifNumberAfter - exifNumberBefore < 0 && (
        <>
          <small className='form-text'>
            Meta tags like {exifMessageBefore} were removed.
          </small>
          <br />
          <small className='form-text'>
            File disappears after download{canIShareFile && ' or share'}.
          </small>
        </>
      )}
    </>
  )
}

export default DownloadBlock
