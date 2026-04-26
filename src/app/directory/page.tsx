import { permanentRedirect } from 'next/navigation'

export default function DirectoryPage() {
  permanentRedirect('/categories')
}
