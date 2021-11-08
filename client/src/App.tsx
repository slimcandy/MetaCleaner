import { useState } from 'react'
import Table from './components/Table/Table'
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
          <Form onChange={setMetaData} />
          {Object.keys(meta.before).length > 1 && <Table data={meta} />}
        </div>
      </div>
    </div>
  )
}

export default App
