"""general ledger tables

Revision ID: 4f1f4c1bc0c7
Revises: 0acc8731db0b
Create Date: 2026-04-05 22:08:43.070254

Creates GL enums and organization-scoped ledger tables (CoA, journals, dimensions,
billing batches, IFRS 15 schedules, recurring templates, audit events).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "4f1f4c1bc0c7"
down_revision: Union[str, Sequence[str], None] = "0acc8731db0b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            DO $$ BEGIN
                CREATE TYPE glaccounttype AS ENUM (
                    'asset', 'liability', 'equity', 'revenue', 'expense'
                );
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """
        )
    )
    op.execute(
        sa.text(
            """
            DO $$ BEGIN
                CREATE TYPE glnormalbalance AS ENUM ('debit', 'credit');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """
        )
    )
    op.execute(
        sa.text(
            """
            DO $$ BEGIN
                CREATE TYPE glsubledgerkind AS ENUM ('none', 'ar', 'ap');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """
        )
    )
    op.execute(
        sa.text(
            """
            DO $$ BEGIN
                CREATE TYPE glperiodstatus AS ENUM (
                    'open', 'soft_close', 'hard_close'
                );
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """
        )
    )
    op.execute(
        sa.text(
            """
            DO $$ BEGIN
                CREATE TYPE gljournalstatus AS ENUM ('draft', 'posted');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """
        )
    )
    op.execute(
        sa.text(
            """
            DO $$ BEGIN
                CREATE TYPE glrecurringfrequency AS ENUM ('monthly', 'quarterly');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """
        )
    )

    op.create_table(
        "gl_legal_entities",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("functional_currency", sa.String(length=3), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_gl_legal_entities_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_legal_entities")),
        sa.UniqueConstraint("organization_id", "code", name="uq_gl_legal_entities_org_code"),
    )
    op.create_index(
        op.f("ix_gl_legal_entities_organization_id"),
        "gl_legal_entities",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_gl_legal_entities_org_primary",
        "gl_legal_entities",
        ["organization_id", "is_primary"],
        unique=False,
    )

    op.create_table(
        "gl_dimensions",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=128), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_gl_dimensions_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_dimensions")),
        sa.UniqueConstraint("organization_id", "key", name="uq_gl_dimensions_org_key"),
    )
    op.create_index(
        op.f("ix_gl_dimensions_organization_id"),
        "gl_dimensions",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "gl_dimension_values",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("dimension_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["dimension_id"],
            ["gl_dimensions.id"],
            name=op.f("fk_gl_dimension_values_dimension_id_gl_dimensions"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_gl_dimension_values_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_dimension_values")),
        sa.UniqueConstraint("dimension_id", "code", name="uq_gl_dimension_values_dim_code"),
    )
    op.create_index(
        op.f("ix_gl_dimension_values_dimension_id"),
        "gl_dimension_values",
        ["dimension_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_dimension_values_organization_id"),
        "gl_dimension_values",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_gl_dimension_values_org_dim",
        "gl_dimension_values",
        ["organization_id", "dimension_id"],
        unique=False,
    )

    op.create_table(
        "gl_accounts",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("parent_account_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "account_type",
            postgresql.ENUM(
                "asset",
                "liability",
                "equity",
                "revenue",
                "expense",
                name="glaccounttype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "normal_balance",
            postgresql.ENUM("debit", "credit", name="glnormalbalance", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "subledger_kind",
            postgresql.ENUM("none", "ar", "ap", name="glsubledgerkind", create_type=False),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_control_account", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_gl_accounts_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["parent_account_id"],
            ["gl_accounts.id"],
            name=op.f("fk_gl_accounts_parent_account_id_gl_accounts"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_accounts")),
        sa.UniqueConstraint("organization_id", "code", name="uq_gl_accounts_org_code"),
    )
    op.create_index(
        op.f("ix_gl_accounts_organization_id"),
        "gl_accounts",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_accounts_parent_account_id"),
        "gl_accounts",
        ["parent_account_id"],
        unique=False,
    )
    op.create_index(
        "ix_gl_accounts_org_parent",
        "gl_accounts",
        ["organization_id", "parent_account_id"],
        unique=False,
    )

    op.create_table(
        "gl_accounting_periods",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("label", sa.String(length=32), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "open",
                "soft_close",
                "hard_close",
                name="glperiodstatus",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_gl_accounting_periods_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_accounting_periods")),
        sa.UniqueConstraint(
            "organization_id",
            "period_start",
            name="uq_gl_accounting_periods_org_start",
        ),
    )
    op.create_index(
        op.f("ix_gl_accounting_periods_organization_id"),
        "gl_accounting_periods",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_gl_accounting_periods_org_status",
        "gl_accounting_periods",
        ["organization_id", "status"],
        unique=False,
    )

    op.create_table(
        "gl_journal_entries",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("legal_entity_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("posting_period_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM("draft", "posted", name="gljournalstatus", create_type=False),
            nullable=False,
        ),
        sa.Column("document_currency", sa.String(length=3), nullable=False),
        sa.Column("base_currency", sa.String(length=3), nullable=False),
        sa.Column("fx_rate_to_base", sa.Numeric(precision=18, scale=8), nullable=True),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("reference", sa.String(length=128), nullable=True),
        sa.Column("source_batch_id", sa.String(length=128), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["legal_entity_id"],
            ["gl_legal_entities.id"],
            name=op.f("fk_gl_journal_entries_legal_entity_id_gl_legal_entities"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_gl_journal_entries_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["posting_period_id"],
            ["gl_accounting_periods.id"],
            name=op.f("fk_gl_journal_entries_posting_period_id_gl_accounting_periods"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_journal_entries")),
    )
    op.create_index(
        op.f("ix_gl_journal_entries_organization_id"),
        "gl_journal_entries",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_journal_entries_legal_entity_id"),
        "gl_journal_entries",
        ["legal_entity_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_journal_entries_posting_period_id"),
        "gl_journal_entries",
        ["posting_period_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_journal_entries_source_batch_id"),
        "gl_journal_entries",
        ["source_batch_id"],
        unique=False,
    )
    op.create_index(
        "ix_gl_journal_entries_org_entity_status",
        "gl_journal_entries",
        ["organization_id", "legal_entity_id", "status"],
        unique=False,
    )

    op.create_table(
        "gl_journal_lines",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("journal_entry_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("account_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("debit", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("credit", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("line_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["account_id"],
            ["gl_accounts.id"],
            name=op.f("fk_gl_journal_lines_account_id_gl_accounts"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["journal_entry_id"],
            ["gl_journal_entries.id"],
            name=op.f("fk_gl_journal_lines_journal_entry_id_gl_journal_entries"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_gl_journal_lines_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_journal_lines")),
    )
    op.create_index(
        op.f("ix_gl_journal_lines_organization_id"),
        "gl_journal_lines",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_journal_lines_journal_entry_id"),
        "gl_journal_lines",
        ["journal_entry_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_journal_lines_account_id"),
        "gl_journal_lines",
        ["account_id"],
        unique=False,
    )
    op.create_index(
        "ix_gl_journal_lines_org_account",
        "gl_journal_lines",
        ["organization_id", "account_id"],
        unique=False,
    )

    op.create_table(
        "gl_journal_line_dimension_tags",
        sa.Column("journal_line_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("dimension_value_id", sa.UUID(as_uuid=False), nullable=False),
        sa.ForeignKeyConstraint(
            ["dimension_value_id"],
            ["gl_dimension_values.id"],
            name=op.f(
                "fk_gl_journal_line_dimension_tags_dimension_value_id_gl_dimension_values"
            ),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["journal_line_id"],
            ["gl_journal_lines.id"],
            name=op.f(
                "fk_gl_journal_line_dimension_tags_journal_line_id_gl_journal_lines"
            ),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "journal_line_id",
            "dimension_value_id",
            name=op.f("pk_gl_journal_line_dimension_tags"),
        ),
    )

    op.create_table(
        "gl_billing_batches",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("legal_entity_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("external_batch_id", sa.String(length=128), nullable=False),
        sa.Column("source_system", sa.String(length=64), nullable=False),
        sa.Column("event_count", sa.Integer(), nullable=False),
        sa.Column("total_amount", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["legal_entity_id"],
            ["gl_legal_entities.id"],
            name=op.f("fk_gl_billing_batches_legal_entity_id_gl_legal_entities"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_gl_billing_batches_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_billing_batches")),
        sa.UniqueConstraint(
            "organization_id",
            "external_batch_id",
            "source_system",
            name="uq_gl_billing_batches_org_ext_src",
        ),
    )
    op.create_index(
        op.f("ix_gl_billing_batches_organization_id"),
        "gl_billing_batches",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_billing_batches_legal_entity_id"),
        "gl_billing_batches",
        ["legal_entity_id"],
        unique=False,
    )
    op.create_index(
        "ix_gl_billing_batches_org_received",
        "gl_billing_batches",
        ["organization_id", "received_at"],
        unique=False,
    )

    op.create_table(
        "gl_revenue_recognition_schedules",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("legal_entity_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("contract_name", sa.String(length=255), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("total_contract_value", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["legal_entity_id"],
            ["gl_legal_entities.id"],
            name=op.f(
                "fk_gl_revenue_recognition_schedules_legal_entity_id_gl_legal_entities"
            ),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f(
                "fk_gl_revenue_recognition_schedules_organization_id_organizations"
            ),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_revenue_recognition_schedules")),
    )
    op.create_index(
        op.f("ix_gl_revenue_recognition_schedules_organization_id"),
        "gl_revenue_recognition_schedules",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_revenue_recognition_schedules_legal_entity_id"),
        "gl_revenue_recognition_schedules",
        ["legal_entity_id"],
        unique=False,
    )

    op.create_table(
        "gl_revenue_recognition_schedule_lines",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("schedule_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("period_month", sa.Date(), nullable=False),
        sa.Column("deferred_opening", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("recognized_in_period", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("deferred_closing", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f(
                "fk_gl_revenue_recognition_schedule_lines_organization_id_organizations"
            ),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["schedule_id"],
            ["gl_revenue_recognition_schedules.id"],
            name=op.f(
                "fk_gl_revenue_recognition_schedule_lines_schedule_id_gl_revenue_recognition_schedules"
            ),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_revenue_recognition_schedule_lines")),
    )
    op.create_index(
        op.f("ix_gl_revenue_recognition_schedule_lines_organization_id"),
        "gl_revenue_recognition_schedule_lines",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_revenue_recognition_schedule_lines_schedule_id"),
        "gl_revenue_recognition_schedule_lines",
        ["schedule_id"],
        unique=False,
    )
    op.create_index(
        "ix_gl_rev_sched_lines_sched_month",
        "gl_revenue_recognition_schedule_lines",
        ["schedule_id", "period_month"],
        unique=False,
    )

    op.create_table(
        "gl_recurring_entry_templates",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("legal_entity_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column(
            "frequency",
            postgresql.ENUM(
                "monthly",
                "quarterly",
                name="glrecurringfrequency",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("day_of_month", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["legal_entity_id"],
            ["gl_legal_entities.id"],
            name=op.f(
                "fk_gl_recurring_entry_templates_legal_entity_id_gl_legal_entities"
            ),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_gl_recurring_entry_templates_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_recurring_entry_templates")),
    )
    op.create_index(
        op.f("ix_gl_recurring_entry_templates_organization_id"),
        "gl_recurring_entry_templates",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_recurring_entry_templates_legal_entity_id"),
        "gl_recurring_entry_templates",
        ["legal_entity_id"],
        unique=False,
    )

    op.create_table(
        "gl_recurring_entry_template_lines",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("template_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("account_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("debit", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("credit", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("line_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["account_id"],
            ["gl_accounts.id"],
            name=op.f("fk_gl_recurring_entry_template_lines_account_id_gl_accounts"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f(
                "fk_gl_recurring_entry_template_lines_organization_id_organizations"
            ),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["template_id"],
            ["gl_recurring_entry_templates.id"],
            name=op.f(
                "fk_gl_recurring_entry_template_lines_template_id_gl_recurring_entry_templates"
            ),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_recurring_entry_template_lines")),
    )
    op.create_index(
        op.f("ix_gl_recurring_entry_template_lines_organization_id"),
        "gl_recurring_entry_template_lines",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_recurring_entry_template_lines_template_id"),
        "gl_recurring_entry_template_lines",
        ["template_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_recurring_entry_template_lines_account_id"),
        "gl_recurring_entry_template_lines",
        ["account_id"],
        unique=False,
    )

    op.create_table(
        "gl_audit_events",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("subject_type", sa.String(length=64), nullable=False),
        sa.Column("subject_id", sa.String(length=36), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("actor_user_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["users.id"],
            name=op.f("fk_gl_audit_events_actor_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_gl_audit_events_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gl_audit_events")),
    )
    op.create_index(
        op.f("ix_gl_audit_events_organization_id"),
        "gl_audit_events",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_audit_events_subject_type"),
        "gl_audit_events",
        ["subject_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_audit_events_subject_id"),
        "gl_audit_events",
        ["subject_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gl_audit_events_created_at"),
        "gl_audit_events",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_gl_audit_events_org_subject",
        "gl_audit_events",
        ["organization_id", "subject_type", "subject_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_gl_audit_events_org_subject", table_name="gl_audit_events")
    op.drop_index(op.f("ix_gl_audit_events_created_at"), table_name="gl_audit_events")
    op.drop_index(op.f("ix_gl_audit_events_subject_id"), table_name="gl_audit_events")
    op.drop_index(op.f("ix_gl_audit_events_subject_type"), table_name="gl_audit_events")
    op.drop_index(op.f("ix_gl_audit_events_organization_id"), table_name="gl_audit_events")
    op.drop_table("gl_audit_events")

    op.drop_index(
        op.f("ix_gl_recurring_entry_template_lines_account_id"),
        table_name="gl_recurring_entry_template_lines",
    )
    op.drop_index(
        op.f("ix_gl_recurring_entry_template_lines_template_id"),
        table_name="gl_recurring_entry_template_lines",
    )
    op.drop_index(
        op.f("ix_gl_recurring_entry_template_lines_organization_id"),
        table_name="gl_recurring_entry_template_lines",
    )
    op.drop_table("gl_recurring_entry_template_lines")

    op.drop_index(
        op.f("ix_gl_recurring_entry_templates_legal_entity_id"),
        table_name="gl_recurring_entry_templates",
    )
    op.drop_index(
        op.f("ix_gl_recurring_entry_templates_organization_id"),
        table_name="gl_recurring_entry_templates",
    )
    op.drop_table("gl_recurring_entry_templates")

    op.drop_index(
        "ix_gl_rev_sched_lines_sched_month",
        table_name="gl_revenue_recognition_schedule_lines",
    )
    op.drop_index(
        op.f("ix_gl_revenue_recognition_schedule_lines_schedule_id"),
        table_name="gl_revenue_recognition_schedule_lines",
    )
    op.drop_index(
        op.f("ix_gl_revenue_recognition_schedule_lines_organization_id"),
        table_name="gl_revenue_recognition_schedule_lines",
    )
    op.drop_table("gl_revenue_recognition_schedule_lines")

    op.drop_index(
        op.f("ix_gl_revenue_recognition_schedules_legal_entity_id"),
        table_name="gl_revenue_recognition_schedules",
    )
    op.drop_index(
        op.f("ix_gl_revenue_recognition_schedules_organization_id"),
        table_name="gl_revenue_recognition_schedules",
    )
    op.drop_table("gl_revenue_recognition_schedules")

    op.drop_index("ix_gl_billing_batches_org_received", table_name="gl_billing_batches")
    op.drop_index(
        op.f("ix_gl_billing_batches_legal_entity_id"), table_name="gl_billing_batches"
    )
    op.drop_index(
        op.f("ix_gl_billing_batches_organization_id"), table_name="gl_billing_batches"
    )
    op.drop_table("gl_billing_batches")

    op.drop_table("gl_journal_line_dimension_tags")

    op.drop_index("ix_gl_journal_lines_org_account", table_name="gl_journal_lines")
    op.drop_index(op.f("ix_gl_journal_lines_account_id"), table_name="gl_journal_lines")
    op.drop_index(
        op.f("ix_gl_journal_lines_journal_entry_id"), table_name="gl_journal_lines"
    )
    op.drop_index(
        op.f("ix_gl_journal_lines_organization_id"), table_name="gl_journal_lines"
    )
    op.drop_table("gl_journal_lines")

    op.drop_index(
        "ix_gl_journal_entries_org_entity_status", table_name="gl_journal_entries"
    )
    op.drop_index(
        op.f("ix_gl_journal_entries_source_batch_id"), table_name="gl_journal_entries"
    )
    op.drop_index(
        op.f("ix_gl_journal_entries_posting_period_id"),
        table_name="gl_journal_entries",
    )
    op.drop_index(
        op.f("ix_gl_journal_entries_legal_entity_id"), table_name="gl_journal_entries"
    )
    op.drop_index(
        op.f("ix_gl_journal_entries_organization_id"), table_name="gl_journal_entries"
    )
    op.drop_table("gl_journal_entries")

    op.drop_index(
        "ix_gl_accounting_periods_org_status", table_name="gl_accounting_periods"
    )
    op.drop_index(
        op.f("ix_gl_accounting_periods_organization_id"),
        table_name="gl_accounting_periods",
    )
    op.drop_table("gl_accounting_periods")

    op.drop_index("ix_gl_accounts_org_parent", table_name="gl_accounts")
    op.drop_index(op.f("ix_gl_accounts_parent_account_id"), table_name="gl_accounts")
    op.drop_index(op.f("ix_gl_accounts_organization_id"), table_name="gl_accounts")
    op.drop_table("gl_accounts")

    op.drop_index("ix_gl_dimension_values_org_dim", table_name="gl_dimension_values")
    op.drop_index(
        op.f("ix_gl_dimension_values_organization_id"), table_name="gl_dimension_values"
    )
    op.drop_index(
        op.f("ix_gl_dimension_values_dimension_id"), table_name="gl_dimension_values"
    )
    op.drop_table("gl_dimension_values")

    op.drop_index(op.f("ix_gl_dimensions_organization_id"), table_name="gl_dimensions")
    op.drop_table("gl_dimensions")

    op.drop_index("ix_gl_legal_entities_org_primary", table_name="gl_legal_entities")
    op.drop_index(
        op.f("ix_gl_legal_entities_organization_id"), table_name="gl_legal_entities"
    )
    op.drop_table("gl_legal_entities")

    op.execute(sa.text("DROP TYPE IF EXISTS glrecurringfrequency"))
    op.execute(sa.text("DROP TYPE IF EXISTS gljournalstatus"))
    op.execute(sa.text("DROP TYPE IF EXISTS glperiodstatus"))
    op.execute(sa.text("DROP TYPE IF EXISTS glsubledgerkind"))
    op.execute(sa.text("DROP TYPE IF EXISTS glnormalbalance"))
    op.execute(sa.text("DROP TYPE IF EXISTS glaccounttype"))
