# Corporate Finance Learning OS · 0.3

Независимый учебник и практикум, не официальный продукт НИУ ВШЭ. Локальный кандидат CFLOS-QE-TRANCHE-03; публичный выпуск BLOCKED, лицензии и права UNKNOWN.

## Запуск и проверка

Проверенный runtime и CI pin: Node26.6.0 (.nvmrc), npm и package-lock.json.

```sh
npm ci
npm run dev
```

Откройте Vite URL с путём `/hse-corporate-finance-2026/`.

```sh
npm test
npm run test:financial
npm run review:storage
npm run build
npx playwright install chromium webkit
npm run test:e2e
npm run audit:artifact
npm run audit:public
```

Playwright использует установленный Chrome на macOS или свой Chromium, а для отдельных проверок — WebKit. На Linux нужны зависимости браузеров (`npx playwright install --with-deps chromium webkit`). Порты5182/5183 выделены runner; чужие серверы не переиспользуются. Все данные браузерных тестов синтетические, профили изолированы. Реальный GitHub CI/Pages этим локальным прогоном не подтверждается.

## Область

- Шесть уроков01/03/05/06/07/08,37 разделов,65 worked examples,43 recall.
- 36 формул со смыслом, переменными, единицами, выводом и ограничениями; NWC/ratios labs и причинные схемы.
- 30 фиксированных задач и32 воспроизводимых варианта четырёх моделей, включая frozen benchmark из четырёх случаев. Не62 разных компетенции.
- Фактическая единица числового ответа; проценты/доли, п.п., денежные масштабы, отношения и дни сравниваются после пересчёта.
- Раздельные objectiveScore и reasoningStatus. Текст не получает семантического балла; самопроверка не равна проверке преподавателя. outcomeStatus: NOT_PROVEN.
- Study с этапами, Practice с конечными результатами и отмечаемой помощью, Exam без названия темы и метода; scratchpad и versioned local progress.

Тема3 не завершена. Самостоятельные02/04, полные09/10/11 и трёхлетняя3.7 остаются в плане. Ограниченный DDM-мост не завершает главу09. Нет облака, серверного backup или доказательства учебного эффекта на реальных студентах. История старых ответов и отметок чтения сохраняется; между origin нужен экспорт/импорт JSON.

## Документация

[Архитектура](docs/ARCHITECTURE.md), [источники](docs/SOURCE_MAP.md), [допущения](docs/ASSUMPTIONS_REGISTER.md), [калибровка оценки](docs/ASSESSMENT_CALIBRATION.md), [покрытие семинара](docs/SEM3_COVERAGE_MATRIX.md), [решения владельца о выпуске](docs/OWNER_RELEASE_DECISIONS.md).

В private review-комплекте дополнительно доступны PROJECT_STATE, ROADMAP, CONTENT_QUALITY_SCORECARD, TRANCHE_03_RECEIPT и supporting bytes в evidence/tranche03. Прежние receipts сохранены как история. PDF преподавателя и фотографии реальных КР не распространяются.

## Публичный источник

Цель — GitHub Pages. Workflow требует main, exact SHA, owner dispatch, отдельный release enable, проверку истории/прав и совпадение verified artifact. Лицензии не выбраны. Локальные тесты не дают разрешения на remote, push, merge или deployment; эти переходы не выполнялись.

Разрешённая стратегия — отдельный локальный sanitized source snapshot с новой первоначальной историей и manifest сопоставления immutable Git blobs. Private-история сохраняется. Команда ниже работает только с новым внешним destination и чистым committed source checkpoint; сеть не используется.

```sh
npm run prepare:public -- --out /absolute/new/local/source-directory
```

## Review ZIP

```sh
npm run handoff -- --out /absolute/new/path/CFLOS-QE-TRANCHE-03-review.zip
```

ZIP содержит source/tests/docs/evidence, исключает Git, dependencies, dist, PDF и секретные файлы. HANDOFF.json содержит SHA и явные редактирования локальных путей. Source и числовые fixture сохраняются точно. Это частный комплект проверки, не лицензия или разрешение публикации. В ZIP build sourceKind=review-handoff и dirty=true; чужая Git-история родительской папки не используется как источник версии.
