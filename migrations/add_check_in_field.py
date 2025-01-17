"""添加報到狀態欄位

Revision ID: xxx
Revises: xxx
Create Date: 2024-xx-xx
"""

def upgrade():
    # 在 tournament_participants 表中添加 checked_in 欄位
    op.add_column('tournament_participants',
        sa.Column('checked_in', sa.Boolean(), nullable=False, server_default=sa.text('0'))
    )

def downgrade():
    # 移除 checked_in 欄位
    op.drop_column('tournament_participants', 'checked_in') 