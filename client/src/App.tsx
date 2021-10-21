import { useState } from 'react'
import Form from './components/Form/Form'
import { IMetaDataObject } from './appTypes'

const App = () => {
  const [meta, setMeta] = useState<IMetaDataObject>()

  const setMetaData = (meta: IMetaDataObject) => {
    setMeta(meta)
  }

  return (
    <div className='px-4 py-5 my-5 text-center'>
      <div className='col-lg-6 mx-auto'>
        <Form onChange={setMetaData} />
        {/* <Table data={meta} /> */}
      </div>
    </div>
  )
}

export default App
