import { useState } from 'react'
import DownloadBlock from './components/DownloadBlock/DownloadBlock'
import Form from './components/Form/Form'
import { IMetaDataObject } from './appTypes'
import PrivacyBlock from './components/PrivacyBlock/PrivacyBlock'
import InfoBlock from './components/InfoBlock/InfoBlock'

const App = () => {
  const [meta, setMeta] = useState<IMetaDataObject>({
    before: {},
    after: {},
    file: {
      name: '',
      mimetype: '',
      link: '',
    },
  })

  const [loading, setLoading] = useState(false)

  const setMetaData = ({ data }: { data: IMetaDataObject }): void =>
    setMeta(data)
  const setLoadingData = (state: boolean): void => setLoading(state)

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
                  onChange={setMetaData}
                  setLoadingData={setLoadingData}
                  loading={loading}
                />
                <h2 className='h4'>
                  <li>download meta-free copy</li>
                </h2>
                <DownloadBlock data={meta} loading={loading} />
              </ol>
            </div>
          </div>
        </div>
      </main>
      {/* mt-auto - sticks footer */}
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
