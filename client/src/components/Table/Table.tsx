import { ITableProps } from './types'
import { IMetaData } from '../../appTypes'

const exifTitleMaxLength = 3

const parseTitleFromExifObject = (obj: IMetaData, limit = 3) => {
  let resultString = ''
  const objLength = Object.keys(obj).length
  const objKeys = Object.keys(obj)

  if (objLength > limit) {
    const objShortKeys = objKeys.slice(0, limit)
    for (let i = 0; i < limit - 1; i++) {
      resultString += `${objShortKeys[i]}: ${obj[objShortKeys[i]]}; `
    }
    resultString += `and ${objLength - limit + 1} more`
  } else {
    for (const key in obj) {
      resultString += `${key}: ${obj[key]}; `
    }
  }

  return resultString
}

const Table = (props: ITableProps): JSX.Element => {
  if (!props.data) {
    return <></>
  }

  const exifNumberBefore = Object.keys(props.data.before).length
  const exifMessageBefore = parseTitleFromExifObject(
    props.data.before,
    exifTitleMaxLength
  )
  const exifNumberAfter = Object.keys(props.data.after).length
  const exifMessageAfter = parseTitleFromExifObject(
    props.data.after,
    exifTitleMaxLength
  )
  const fileInfo = props.data.file

  return (
    <table className='table table-hover align-middle'>
      <thead>
        <tr>
          <th scope='col'>Selected files</th>
          <th scope='col'>Exif before</th>
          <th scope='col'>Exif after</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope='row'>
            <a
              href={fileInfo.link}
              title='Download file without meta info'
              className='btn btn-primary'
            >
              {fileInfo.name}
            </a>
          </th>
          <td>
            <span className='badge bg-danger' title={exifMessageBefore}>
              {exifNumberBefore}
            </span>
          </td>
          <td>
            <span className='badge bg-success' title={exifMessageAfter}>
              {exifNumberAfter}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export default Table
