import { IProps } from './types'

const InfoBlock = ({ className }: IProps): JSX.Element => {
  return (
    <div className={className}>
      <h5>Information</h5>
      <p>
        It's open-source using{' '}
        <a
          href='https://github.com/hMatoba/piexifjs'
          rel='nofollow noopener'
          title='Read and modify exif.'
        >
          Piexifjs
        </a>{' '}
        to remove exif.
      </p>
      <dl className='d-flex flex-column flex-wrap bg-light py-4 px-3 rounded'>
        <div className='d-flex flex-row flex-wrap'>
          <dt>Compatibility</dt>
          <dd className='ps-2'>Internet Explorer 9, ES6.</dd>
        </div>
        <div className='d-flex flex-row flex-wrap'>
          <dt>Source code</dt>
          <dd className='ps-2'>
            <a
              href='https://github.com/slimcandy/removemetaonline'
              rel='nofollow noopener'
            >
              GitHub project
            </a>
          </dd>
        </div>
      </dl>
    </div>
  )
}
export default InfoBlock
