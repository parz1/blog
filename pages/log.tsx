import Layout from '../components/layout'
import { getChangeLogCtx } from '../lib/log'

// const getChangeLog = async () => {
//   const res = await getChangeLogCtx()
//   console.log(res)
// }

export async function getStaticProps() {
  const changelog = await getChangeLogCtx()
  return {
    props: {
      changelog,
    },
  }
}
export default function Log({ changelog }) {
  return (
    <Layout>
      <div>Log</div>
      <div dangerouslySetInnerHTML={{ __html: changelog.contentHtml }} />
    </Layout>
  )
}
