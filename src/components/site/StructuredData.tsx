import type { SchemaNode } from '@/lib/structured-data'

interface StructuredDataProps {
  data: SchemaNode | Array<SchemaNode | null | undefined | false>
}

function serializeSchema(data: SchemaNode) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function StructuredData({ data }: StructuredDataProps) {
  const items = (Array.isArray(data) ? data : [data]).filter(Boolean) as SchemaNode[]

  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeSchema(item) }}
        />
      ))}
    </>
  )
}
