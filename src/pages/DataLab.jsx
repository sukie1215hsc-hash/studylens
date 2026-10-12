import { useI18n } from '../i18n/LanguageContext'
import CategoryChart from '../components/CategoryChart'
import LearningMomentum from '../components/LearningMomentum'
import RecordList from '../components/RecordList'
import styles from './DataLab.module.css'

export default function DataLab({ records, studyLoading = false, studyError = '' }) {
  const { t } = useI18n()
  return (
    <div className={styles.dataLabContainer}>
      <p className={styles.kicker}>{t('lab.kicker')}</p>
      <h1 className={styles.pageTitle}>{t('lab.title')}</h1>
      <p className={styles.lede}>{studyError ? t(studyError) : t('lab.lede')}</p>
      {studyLoading ? null : (
        <>
          <LearningMomentum records={records} />
          <CategoryChart records={records} />
          <RecordList records={records} />
        </>
      )}
    </div>
  )
}
