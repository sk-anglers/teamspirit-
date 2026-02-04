// TeamSpirit Assistant - Configuration
// 組織固有の設定と定数を一元管理する
// ※ manifest.json の host_permissions / content_scripts.matches でも同じドメインを使用

const CONFIG = {
  // 組織ID
  TS_ORG_ID: 'teamspirit-74532',

  // URL定数
  TEAMSPIRIT_URL: 'https://teamspirit-74532.lightning.force.com/lightning/page/home',
  TEAMSPIRIT_ATTENDANCE_URL: 'https://teamspirit-74532.lightning.force.com/lightning/n/teamspirit__AtkWorkTimeTab',
  LOGIN_URL: 'https://login.salesforce.com/',
  MY_DOMAIN_LOGIN_URL: 'https://teamspirit-74532.my.salesforce.com/',
  HOLIDAYS_API_URL: 'https://holidays-jp.github.io/api/v1/date.json',

  // タブ検索用URLパターン（manifest.json の host_permissions と同期すること）
  TAB_QUERY_PATTERNS: [
    'https://teamspirit-74532.lightning.force.com/*',
    'https://teamspirit-74532.my.salesforce.com/*',
    'https://login.salesforce.com/*',
    'https://*.salesforce.com/*',
    'https://*.my.salesforce.com/*',
    'https://*.force.com/*'
  ],

  // 暗号化キー（セキュリティ改善タスクで別途対応予定）
  ENCRYPTION_KEY: 'ts-assistant-v3-2026',

  // 作業時間定数
  STANDARD_HOURS_PER_DAY: 8 * 60, // 8時間 = 480分
  OVERTIME_LIMIT: 45 * 60          // 45時間 = 2700分
};
