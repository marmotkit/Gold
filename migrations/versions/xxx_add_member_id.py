"""add member_id column

Revision ID: xxx
Revises: previous_revision
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('participants', sa.Column('member_id', sa.String(20)))

def downgrade():
    op.drop_column('participants', 'member_id') 