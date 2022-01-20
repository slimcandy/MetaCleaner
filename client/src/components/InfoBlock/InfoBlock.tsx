import { IProps } from './types'

const InfoBlock = ({ className }: IProps): JSX.Element => {
  return (
    <div className={className}>
      <h5>Information</h5>
      <p>
        It's open-source project inspired by{' '}
        <a
          href='https://exiftool.org'
          rel='nofollow noopener'
          title='Electron-based project'
        >
          ExifTool
        </a>{' '}
        and{' '}
        <a
          href='https://exifcleaner.com'
          rel='nofollow noopener'
          title='Original Perl library'
        >
          ExifCleaner
        </a>
        .
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
        <div className='d-flex flex-row flex-wrap'>
          <dt>EfixTool</dt>
          <dd className='ps-2'>12.34</dd>
        </div>
      </dl>
    </div>
  )
}
export default InfoBlock
