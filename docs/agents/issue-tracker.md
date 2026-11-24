# Трекер: GitHub Issues

Задачи разработки интеграции и их спецификации публикуй в `stepanosokin/yougile-gdc` через `gh` из корня репозитория. Рабочие задачи команды ведутся в YouGile; не копируй их содержимое в GitHub Issues.

- Создать: `gh issue create --title "..." --body-file <file>`.
- Прочитать: `gh issue view <n> --json number,title,body,labels,comments`.
- Найти по метке: `gh issue list --state open --label <label>`.
- Изменить метки: `gh issue edit <n> --add-label <label>` или `--remove-label <label>`.
- Прокомментировать: `gh issue comment <n> --body-file <file>`.
- Закрыть с пояснением: `gh issue close <n> --comment "..."`.

PRs as a request surface: no.

## Wayfinder
Карта — issue с меткой `wayfinder:map`. Тикеты — её sub-issues с меткой
`wayfinder:<type>` (research, prototype, grilling или task). Если sub-issues
недоступны, веди список в карте и укажи `Part of #<map>` в дочернем тикете.

Блокировки фиксируй через GitHub issue dependencies; если они недоступны —
строкой `Blocked by: #<n>` в тикете. Бери первый по порядку карты открытый
тикет без исполнителя и открытых блокеров. Первым изменением назначь его
на себя: `gh issue edit <n> --add-assignee "@me"`. При завершении оставь
ответ в тикете, закрой его и добавь вывод со ссылкой в Decisions-so-far карты.
