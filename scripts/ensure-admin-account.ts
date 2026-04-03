import { bootstrapApplication } from '../src/lib/bootstrap'

bootstrapApplication()
  .then(() => {
    console.log('Bes3 admin account ensured.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to ensure Bes3 admin account:', error)
    process.exit(1)
  })
