"""add_person_id_to_registrants

Revision ID: 08d840b7bf09
Revises: 82e82d6d4152
Create Date: 2025-10-20 21:02:56.322182

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '08d840b7bf09'
down_revision = '82e82d6d4152'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add person_id column to registrants table
    op.add_column('registrants', sa.Column('person_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_registrants_person_id'), 'registrants', ['person_id'], unique=False)
    
    # Initialize person_id to the registrant's own id (each person is their own canonical record initially)
    op.execute('UPDATE registrants SET person_id = id WHERE person_id IS NULL')


def downgrade() -> None:
    # Remove person_id column and index
    op.drop_index(op.f('ix_registrants_person_id'), table_name='registrants')
    op.drop_column('registrants', 'person_id')
