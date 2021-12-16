import { Dispatch, SetStateAction } from 'react'
import { IMetaDataObject } from '../App/types'

export interface IFormProps {
  onChange: Dispatch<SetStateAction<IMetaDataObject>>
  setLoadingData: Dispatch<SetStateAction<boolean>>
  loading: boolean
}
