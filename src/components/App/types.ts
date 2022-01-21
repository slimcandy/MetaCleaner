export interface IMetaData {
  [key: string]: string
}

export interface IMetaFileInfo {
  name: string
  mimetype: string
  link: string
}

export type fileObject = {
  imageBase64: string
  mime: string
  name: string
}
