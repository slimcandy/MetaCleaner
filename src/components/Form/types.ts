import { Dispatch, SetStateAction } from 'react'
import { fileObject } from '../App/types'

export interface IFormProps {
  onChange: Dispatch<SetStateAction<fileObject>>
  setLoadingData: Dispatch<SetStateAction<boolean>>
  loading: boolean
  isFileReadyToDownload: boolean
}
