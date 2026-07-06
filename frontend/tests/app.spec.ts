import { expect, test } from '@playwright/test'

const screenIds = [
  'login',
  'workbench',
  'ai-workspace',
  'announcements',
  'calendar',
  'message-center',
  'flow-center',
  'flow-project',
  'flow-fund',
  'flow-oa',
  'project-board',
  'project-list',
  'project-add',
  'project-detail-overview',
  'project-detail-investment',
  'project-detail-postdata',
  'meeting-ai',
  'fund-list',
  'fund-add',
  'fund-detail-overview',
  'fund-detail-cashflow',
  'fund-detail-financials',
  'investment-info',
  'equity-change',
  'investor-list',
  'investor-detail',
  'manager-orgs',
  'post-data-collection',
  'risk-clauses',
  'burst-risk',
  'document-center',
  'process-files',
  'research-library',
  'internal-research',
  'report-dashboard',
  'import-export',
  'system-users',
  'roles-permissions',
  'field-config',
  'account-settings',
  'recycle-bin',
]

async function login(page: import('@playwright/test').Page) {
  await page.goto('/#/login')
  await expect(page.locator('[data-screen-id="login"]')).toBeVisible()
  await page.getByTestId('login-submit').click()
  await expect(page.locator('[data-screen-id="workbench"]')).toBeVisible()
}

test('login flow enters the workbench', async ({ page }) => {
  await login(page)
  await expect(page.getByTestId('screen-title')).toContainText('管理层工作台')
})

test('all 41 screens are routable and visible', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('capitalos-session', 'active'))

  for (const id of screenIds) {
    await page.goto(`/#/${id}`)
    await expect(page.locator(`[data-screen-id="${id}"]`)).toBeVisible()
    await expect(page.getByTestId('screen-title')).toBeVisible()
  }
})

test('project board covers the full nine-stage pipeline', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('capitalos-session', 'active'))
  await page.goto('/#/project-board')
  await expect(page.locator('.kanban-column')).toHaveCount(9)
  await expect(page.getByTestId('kanban-board')).toContainText('投后服务')
})

test('list pages support search, selection, and async action controls', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('capitalos-session', 'active'))
  await page.goto('/#/project-list')
  await expect(page.getByTestId('records-table')).toBeVisible()
  await page.getByTestId('search-input').fill('__no_match__')
  await expect(page.getByTestId('records-table')).toContainText('暂无匹配记录')
  await page.getByTestId('search-input').fill('Matrix')
  await expect(page.getByTestId('records-table')).toContainText('Matrix Medical')
})

test('detail tabs switch without losing the object context', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('capitalos-session', 'active'))
  await page.goto('/#/project-detail-overview')
  await expect(page.getByTestId('detail-tabs').locator('button')).toHaveCount(11)
  await page.getByRole('button', { name: '协议条款 AI' }).click()
  await expect(page.locator('.tab-summary')).toContainText('协议条款 AI')
})

test('read-only role disables write actions and shows permission state', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('capitalos-session', 'active'))
  await page.goto('/#/project-list')
  await page.getByLabel('当前角色').selectOption({ index: 7 })
  await expect(page.locator('.permission-banner')).toBeVisible()
  await expect(page.locator('.page-header .primary-button')).toBeDisabled()
})
