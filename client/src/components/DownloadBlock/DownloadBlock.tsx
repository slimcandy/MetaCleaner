import { useState, useEffect } from 'react'
import { IDownloadBlockProps } from './types'
import { shareAction } from './utils'
import downloadIcon from '../../static/icons/downloadIcon.svg'
import shareIcon from '../../static/icons/shareIcon.svg'

const DownloadBlock = (props: IDownloadBlockProps): JSX.Element => {
  const [canIShareFile, setCanIShareFile] = useState<boolean>(false)
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

  if (!props.data) {
    return (
      <small className='form-text'>
        Error: cannot read the file. Please try again.
      </small>
    )
  }

  const exifNumberBefore = Object.keys(props.data.before).length
  const fileInfo = props.data.file

  if (props.data.file.name === '') {
    return <small className='form-text'>Download link appears here.</small>
  }
  if (exifNumberBefore === 0) {
    return <small className='form-text'>File already has no meta tags.</small>
  }
  return (
    <>
      <div className='d-flex flex-wrap align-content-center align-items-center justify-content-center'>
        {props.loading ? (
          <button
            className={`btn btn-primary btn-lg ${
              canIShareFile ? 'col-12 col-sm-6' : 'col-12'
            }`}
            disabled
          >
            <span
              className='spinner-border spinner-border-sm me-2'
              role='status'
              aria-hidden='true'
            ></span>
            Removing file meta-data…
          </button>
        ) : (
          <a
            href={fileInfo.link}
            title={fileInfo.name}
            className={`btn btn-primary btn-lg ${
              props.loading ? 'disabled' : ''
            } ${canIShareFile ? 'col-12 col-sm-6' : 'col-12'}`}
            type={fileInfo.mimetype}
          >
            {downloadIcon} download
          </a>
        )}
        {canIShareFile && !props.loading && (
          <button
            type='button'
            className='btn btn-light btn-lg mt-2 mt-sm-0 col-12 offset-sm-1 col-sm-5'
            onClick={() => shareAction(fileInfo)}
          >
            {shareIcon} share
          </button>
        )}
      </div>
    </>
  )
}

export default DownloadBlock
