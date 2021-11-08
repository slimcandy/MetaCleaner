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
      <div className='px-4 py-5 my-5'>
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
