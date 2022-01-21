import { useState, useEffect } from 'react'
import DownloadBlock from '../DownloadBlock'
import Form from '../Form'
import PrivacyBlock from '../PrivacyBlock'
import InfoBlock from '../InfoBlock'
import { fileObject } from './types'

const App = (): JSX.Element => {
  const [file, setFile] = useState<fileObject>({
    imageBase64: '',
    name: '',
    mime: '',
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [isFileReadyToDownload, setIsFileReadyToDownload] =
    useState<boolean>(false)

  useEffect(() => {
    setIsFileReadyToDownload(file.imageBase64.length > 0)
  }, [file])

  const getDownloadBlock = () => {
    if (loading) {
      return (
        <>
          <span
            className='spinner-border spinner-border-sm me-2'
            role='status'
            aria-hidden='true'
          ></span>
          Removing file meta-data…
        </>
      )
    }
    if (isFileReadyToDownload) {
      return <DownloadBlock file={file} />
    }
  }

  return (
    <>
      <main className='container flex-shrink-0 mb-5 mb-sm-4 mb-md-3 mb-lg-2 mb-xl-0'>
        <div className='row'>
          <div className='px-3 px-lg-4 px-xl-5 py-3 py-lg-4 py-xl-5 my-3 my-lg-4 my-xl-5'>
            <div className='col-lg-6 mx-auto'>
              <ol>
                <h2 className='h4'>
                  <li>choose picture</li>
                </h2>
                <Form
                  onChange={setFile}
                  setLoadingData={setLoading}
                  loading={loading}
                  isFileReadyToDownload={isFileReadyToDownload}
                />
                <h2 className='h4'>
                  <li>download meta-free copy</li>
                </h2>
                {getDownloadBlock()}
              </ol>
            </div>
          </div>
        </div>
      </main>
      {/* mt-auto - sticks footer to the bottom */}
      <footer className='footer mt-auto'>
        <details className='py-3 container'>
          <summary className='btn btn-light btn-sm'>Privacy</summary>
          <div className='row justify-content-around mt-4'>
            <InfoBlock className='col-12 col-sm-6 col-lg-4' />
            <PrivacyBlock className='col-12 col-sm-6 col-lg-4' />
          </div>
        </details>
      </footer>
    </>
  )
}

export default App
