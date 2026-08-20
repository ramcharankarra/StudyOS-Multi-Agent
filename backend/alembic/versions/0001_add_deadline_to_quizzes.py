"""Add deadline column to quizzes

Revision ID: 0001_add_deadline_to_quizzes
Revises: 
Create Date: 2026-08-20

"""
from alembic import op
import sqlalchemy as me


# revision identifiers, used by Alembic.
revision = '0001_add_deadline_to_quizzes'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('quizzes', me.Column('deadline', me.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('quizzes', 'deadline')
