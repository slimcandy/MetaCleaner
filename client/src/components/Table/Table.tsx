import { ITableProps } from './types'

const Table = (props: ITableProps): JSX.Element => {
  if (!props.data) {
    return <></>
  }

  const exifNumberBefore = Object.keys(props.data.before).length
  const exifNumberAfter = Object.keys(props.data.after).length
  const fileInfo = props.data.file

  return (
    <table className='table'>
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
            <a href={fileInfo.link}>{fileInfo.name}</a>
          </th>
          <td>{exifNumberBefore}</td>
          <td>{exifNumberAfter}</td>
        </tr>
      </tbody>
    </table>
  )
}

export default Table
