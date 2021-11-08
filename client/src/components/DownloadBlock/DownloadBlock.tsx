import { IDownloadBlockProps } from './types'
import { IMetaData } from '../../appTypes'

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

const parseTitleFromExifObject = (obj: IMetaData, limit = 3) => {
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

const DownloadBlock = (props: IDownloadBlockProps): JSX.Element => {
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
      <div className='d-grid '>
        <a
          href={fileInfo.link}
          title={fileInfo.name}
          className='btn btn-primary btn-lg'
        >
          {downloadIcon} Download
        </a>
      </div>
      {exifNumberAfter - exifNumberBefore < 0 && (
        <small className='form-text'>
          Meta tags like {exifMessageBefore} were removed
        </small>
      )}
    </>
  )
}

export default DownloadBlock
