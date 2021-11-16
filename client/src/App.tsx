import { useState } from 'react'
import DownloadBlock from './components/DownloadBlock/DownloadBlock'
import Form from './components/Form/Form'
import { IMetaDataObject } from './appTypes'

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

  const setMetaData = ({ data }: { data: IMetaDataObject }) => setMeta(data)

  return (
    <div className='container'>
      <div className='px-1 px-sm-2 px-md-3 px-lg-4 px-xl-5 py-1 py-sm-2 py-md-3 py-lg-4 py-xl-5 my-1 my-sm-2 my-md-3 my-lg-4 my-xl-5'>
        <div className='col-lg-6 mx-auto'>
          <ol>
            <h2>
              <li>choose file</li>
            </h2>
            <Form onChange={setMetaData} />
            <h2>
              <li>download meta-free copy</li>
            </h2>
            <DownloadBlock data={meta} />
          </ol>
        </div>
      </div>
    </div>
  )
}

export default App
