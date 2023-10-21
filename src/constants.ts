export const SELECTOR = {
  START_DATE_PICKER: '#documentArchiveListForm_dateRangeComponent_startDate',
  END_DATE_PICKER: '#documentArchiveListForm_dateRangeComponent_endDate',
  DOCUMENT_CATEGORY_SELECT: '#documentArchiveListForm_documentCategory',
  PERIOD_SELECT: '#documentArchiveListForm_dateRangeComponent_retrievalPeriodSelection',
  ACCOUNT_SELECT: '#documentArchiveListForm_accountSelection_account',
  READ_STATE_SELECT: '#documentArchiveListForm_readState',
};

export const COMMAND_PATTERN = {
  v1: /finished\("(.*)",/g,
  // changed by Flatex on 2022-11-27
  v2: /display\("(.*)",/g,
};

export const AUTH_EVENT = 'flatex-download-chrome-extension/auth';
