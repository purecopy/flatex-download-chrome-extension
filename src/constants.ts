export const SELECTOR = {
  START_DATE_PICKER: '#documentArchiveListForm_dateRangeComponent_startDate',
  END_DATE_PICKER: '#documentArchiveListForm_dateRangeComponent_endDate',
  DOCUMENT_CATEGORY_SELECT: '#documentArchiveListForm_documentCategory',
  PERIOD_SELECT: '#documentArchiveListForm_dateRangeComponent_retrievalPeriodSelection',
  ACCOUNT_SELECT: '#documentArchiveListForm_accountSelection_account',
  READ_STATE_SELECT: '#documentArchiveListForm_readState',
};

export const COMMAND_PATTERN = /finished\("(.*)",/g;

export const TOKEN_ID_PATTERN =
  /setTokenId\(.*"([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})"\);/g;

export const WINDOW_ID_PATTERN = /setCurrentWindowId\(.*"(.*)"\);/g;

export const DOWNLOAD_OFFSET_MS = 3000;
