import { uniq } from 'lodash'
import { createHash } from 'crypto'
import stringify from 'json-stringify-safe'
import fetchData from './fetch'
import {
  TypeNode,
  DocumentNode,
  DatumNode
} from './nodes'

const digest = str => createHash(`md5`).update(str).digest(`hex`)

exports.sourceNodes = async (
  { boundActionCreators, getNodes, hasNodeChanged, store },
  { repositoryName, accessToken }
) => {
  const {
    createNode,
    deleteNodes,
    touchNode,
    setPluginStatus,
  } = boundActionCreators

  const {
    documents
  } = await fetchData({
    repositoryName,
    accessToken
  })

  // Get list of custom types
  const customTypeNames = uniq(documents.map(
    doc => doc.type
  ))

  // Custom types do not have IDs, so generate a reproducable one based on the
  // name. The MD5 hash of the name is used here.
  const customTypeItems = customTypeNames.map(
    customTypeName => ({
      id: digest(customTypeName),
      name: customTypeName
    })
  )

  // Level 1: CustomType nodes
  customTypeItems.forEach(customTypeItem => {
    const customTypeNode = TypeNode({
      customTypeItem
    })

    const customTypeDocuments = documents.filter(
      doc => doc.type === customTypeItem.name
    )

    // Level 2: CustomTypeDocument nodes
    customTypeDocuments.forEach(customTypeDocumentItem => {
      const customTypeDocumentNode = DocumentNode({
        customTypeItem,
        customTypeDocumentItem
      })

      const customTypeDocumentData = customTypeDocumentItem.data

      // Remove slice data
      // TODO: Add this functionality
      delete customTypeDocumentData.body

      // Level 3: CustomTypeDocumentDatum nodes
      Object.keys(customTypeDocumentData).forEach(customTypeDocumentDatumKey => {
        const customTypeDocumentDatumItem = customTypeDocumentData[customTypeDocumentDatumKey]

        // Data do not have IDs, so generate a reproducable one based on the
        // content. The MD5 hash of the content is used here.
        customTypeDocumentDatumItem.id = digest(stringify(customTypeDocumentDatumItem))

        const customTypeDocumentDatumNode = DatumNode({
          customTypeDocumentItem,
          customTypeDocumentDatumItem
        })

        createNode(customTypeDocumentDatumNode)
        customTypeDocumentNode.children = customTypeDocumentNode.children.concat([customTypeDocumentDatumNode.id])
      })

      createNode(customTypeDocumentNode)
      customTypeNode.children = customTypeNode.children.concat([customTypeDocumentNode.id])
    })

    createNode(customTypeNode)
  })

  return
}
