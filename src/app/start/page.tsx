import { permanentRedirect } from 'next/navigation'

export default function StartPage() {
  permanentRedirect('/categories')
}
