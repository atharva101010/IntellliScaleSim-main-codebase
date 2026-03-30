from sqlalchemy import text
from sqlalchemy.engine import Engine


def ensure_columns(engine: Engine):
	if engine.dialect.name == 'sqlite':
		return
	# Lightweight, idempotent column checks. Replace with Alembic in production.
	with engine.connect() as conn:
		user_cols = conn.execute(text("""
			SELECT column_name FROM information_schema.columns
			WHERE table_name='users'
		""")).fetchall()
		existing = {c[0] for c in user_cols}
		# Handle legacy column names
		renamed = False
		if 'hashed_password' in existing and 'password_hash' not in existing:
			conn.execute(text("ALTER TABLE users RENAME COLUMN hashed_password TO password_hash;"))
			existing.remove('hashed_password')
			existing.add('password_hash')
			renamed = True
		if 'username' in existing and 'name' not in existing:
			conn.execute(text("ALTER TABLE users RENAME COLUMN username TO name;"))
			existing.remove('username')
			existing.add('name')
			renamed = True
		if renamed:
			conn.commit()
		alter_statements = []
		if 'name' not in existing:
			alter_statements.append("ALTER TABLE users ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT '';")
			alter_statements.append("UPDATE users SET name = COALESCE(name,'');")
		if 'is_verified' not in existing:
			alter_statements.append("ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;")
		if 'updated_at' not in existing:
			alter_statements.append("ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ NULL;")
			alter_statements.append("UPDATE users SET updated_at = NOW();")
		# Clean up legacy username column if both exist
		if 'username' in existing and 'name' in existing:
			alter_statements.append("ALTER TABLE users DROP COLUMN username;")
		for stmt in alter_statements:
			conn.execute(text(stmt))
		if alter_statements:
			conn.commit()
		
		# Column checks for containers table
		container_cols = conn.execute(text("""
			SELECT column_name, is_nullable FROM information_schema.columns
			WHERE table_name='containers'
		""")).fetchall()
		existing_container_cols = {c[0] for c in container_cols}
		
		image_col = next((c for c in container_cols if c[0] == 'image'), None)
		if image_col and image_col[1] == 'NO':
			# Column exists but is NOT NULL, make it nullable
			conn.execute(text("ALTER TABLE containers ALTER COLUMN image DROP NOT NULL;"))
			conn.commit()
			print("✅ Made containers.image column nullable for GitHub deployments")
		
		if 'parent_id' not in existing_container_cols:
			conn.execute(text("ALTER TABLE containers ADD COLUMN parent_id INTEGER REFERENCES containers(id);"))
			conn.commit()
			print("✅ Added parent_id column to containers table")

