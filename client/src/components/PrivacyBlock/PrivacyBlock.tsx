const PrivacyBlock = (): JSX.Element => {
  return (
    <>
      <h5>Website Privacy</h5>
      <p>
        Website reads{' '}
        <a
          href='https://en.wikipedia.org/wiki/Exif'
          title='Wikipedia description'
        >
          exif meta-data
        </a>{' '}
        , but doesn't store it.
      </p>
      <div className='d-flex align-items-start'>
        <div className='d-flex align-items-start bg-light py-4 px-3 rounded'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='1.75em'
            height='1.75em'
            fill='currentColor'
            className='bi bi-check-circle text-muted flex-shrink-0 me-3'
            viewBox='0 0 16 16'
          >
            <path d='M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z' />
            <path d='M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z' />
          </svg>
          <div>
            <h6 className='mb-0'>Data Not Collected</h6>
            <p>Website does not collect any data from user's file.</p>
          </div>
        </div>
      </div>
    </>
  )
}
export default PrivacyBlock
