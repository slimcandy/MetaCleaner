import { IMetaDataObject } from '../../appTypes'

export interface IFormProps {
  onChange: ({ data }: { data: IMetaDataObject }) => void
  setLoadingData: (state: boolean) => void
}
