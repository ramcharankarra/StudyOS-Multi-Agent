"""Add score and grade columns to submissions

Revision ID: 0002_add_submission_scores
Revises: 0001_add_deadline_to_quizzes
Create Date: 2026-08-20

"""
from alembic import op
import sqlalchemy as sa


revision = '0002_add_submission_scores'
down_revision = '0001_add_deadline_to_quizzes'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('submissions', sa.Column('score', sa.Float(), nullable=True))
    op.add_column('submissions', sa.Column('grade', sa.String(length=50), nullable=True))


def downgrade():
    op.drop_column('submissions', 'grade')
    op.drop_column('submissions', 'score')
