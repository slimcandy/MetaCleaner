export interface IMetaData {
  [key: string]: string
}

export interface IMetaFileInfo {
  name: string
  mimetype: string
  link: string
}
export interface IMetaDataObject {
  before: IMetaData
  after: IMetaData
  file: IMetaFileInfo
}
