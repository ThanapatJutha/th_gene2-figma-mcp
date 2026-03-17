# Troubleshooting

## Common issues

- Capture pending/hangs: use timeout + polling, verify target URL reachable
- Partial capture on external pages: use lazy-load/full-page capture strategy
- Bridge disconnected: restart bridge and reconnect plugin
- Overlapping frames: assign explicit positions and verify after updates
- Node update appears ignored: re-read node and re-apply minimal patch
- Convert failure for text nodes: wrap text in a frame first

## Restart rule

After bridge/plugin source changes, restart bridge and reload plugin before re-testing.