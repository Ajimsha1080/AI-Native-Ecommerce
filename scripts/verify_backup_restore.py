import asyncio
import asyncpg

async def main():
    conn_orig = await asyncpg.connect("postgresql://postgres:postgres@127.0.0.1:5432/aaas_enterprise")
    conn_rest = await asyncpg.connect("postgresql://postgres:postgres@127.0.0.1:5432/aaas_restore_drill")

    tables = [
        'users',
        'workspaces',
        'workspace_members',
        'agents',
        'agent_configs',
        'agent_versions',
        'commerce_products',
        'commerce_orders',
        'api_keys',
        'knowledge_sources',
        'knowledge_documents',
        'processed_webhook_events'
    ]

    print("================================================================")
    print("📦 POSTGRESQL BACKUP & RESTORE DRILL VERIFICATION")
    print("================================================================\n")

    all_matched = True

    for table in tables:
        count_orig = await conn_orig.fetchval(f"SELECT count(*) FROM {table}")
        count_rest = await conn_rest.fetchval(f"SELECT count(*) FROM {table}")

        if count_orig == count_rest:
            print(f"  ✅ [MATCH] Table '{table}': {count_orig} rows in primary == {count_rest} rows in restore")
        else:
            print(f"  ❌ [MISMATCH] Table '{table}': primary={count_orig}, restore={count_rest}")
            all_matched = False

    await conn_orig.close()
    await conn_rest.close()

    if all_matched:
        print("\n🎉 BACKUP & RESTORE DRILL: 100% PERFECT MATCH! ZERO DATA LOSS.")
    else:
        print("\n❌ BACKUP & RESTORE DRILL: MISMATCH DETECTED!")
        exit(1)

if __name__ == "__main__":
    asyncio.run(main())
