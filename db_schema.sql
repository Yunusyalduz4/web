-- Tables
appointment_notes
appointment_reschedule_requests
appointment_services
appointments
audit_logs
business_analytics
business_availability
business_categories
business_category_mapping
business_images
business_photos
business_ratings
business_working_hours
businesses
customer_preferences
email_tokens
employee_availability
employee_login_logs
employee_permissions
employee_ratings
employee_services
employees
favorites
notifications
push_subscriptions
reviews
service_categories
services
stories
story_archive
story_comments
story_daily_stats
story_hashtags
story_likes
story_mentions
story_reports
story_shares
story_views
support_tickets
user_push_subscriptions
users

-- Columns
appointment_notes	id	uuid	NO	gen_random_uuid()
appointment_notes	appointment_id	uuid	NO	
appointment_notes	note	text	NO	
appointment_notes	created_by	uuid	NO	
appointment_notes	created_at	timestamp with time zone	NO	now()
appointment_notes	updated_at	timestamp with time zone	NO	now()
appointment_reschedule_requests	id	uuid	NO	gen_random_uuid()
appointment_reschedule_requests	appointment_id	integer	NO	
appointment_reschedule_requests	requested_by_user_id	integer	NO	
appointment_reschedule_requests	requested_by_role	text	NO	
appointment_reschedule_requests	old_appointment_datetime	timestamp with time zone	NO	
appointment_reschedule_requests	old_employee_id	integer	YES	
appointment_reschedule_requests	new_appointment_datetime	timestamp with time zone	NO	
appointment_reschedule_requests	new_employee_id	integer	YES	
appointment_reschedule_requests	status	text	NO	pending
appointment_reschedule_requests	approved_by_user_id	integer	YES	
appointment_reschedule_requests	approved_at	timestamp with time zone	YES	
appointment_reschedule_requests	rejection_reason	text	YES	
appointment_reschedule_requests	request_reason	text	YES	
appointment_reschedule_requests	created_at	timestamp with time zone	NO	now()
appointment_reschedule_requests	updated_at	timestamp with time zone	NO	now()
appointment_services	id	uuid	NO	gen_random_uuid()
appointment_services	appointment_id	uuid	NO	
appointment_services	service_id	uuid	NO	
appointment_services	employee_id	uuid	NO	
appointment_services	price	numeric	NO	
appointment_services	duration_minutes	integer	NO	
appointment_services	created_at	timestamp with time zone	YES	now()
appointment_services	updated_at	timestamp with time zone	YES	now()
appointments	id	uuid	NO	gen_random_uuid()
appointments	user_id	uuid	YES	
appointments	business_id	uuid	NO	
appointments	appointment_datetime	timestamp with time zone	NO	
appointments	status	text	NO	
appointments	created_at	timestamp with time zone	NO	now()
appointments	updated_at	timestamp with time zone	NO	now()
appointments	customer_name	text	YES	
appointments	customer_phone	text	YES	
appointments	is_manual	boolean	YES	false
appointments	notes	text	YES	
appointments	reminder_sent	boolean	YES	false
appointments	employee_id	uuid	YES	
appointments	reschedule_status	text	YES	none
audit_logs	id	uuid	NO	gen_random_uuid()
audit_logs	user_id	uuid	YES	
audit_logs	action	text	NO	
audit_logs	details	jsonb	YES	
audit_logs	created_at	timestamp with time zone	NO	now()
business_analytics	id	uuid	NO	gen_random_uuid()
business_analytics	business_id	uuid	NO	
business_analytics	date	date	NO	
business_analytics	total_appointments	integer	NO	0
business_analytics	completed_appointments	integer	NO	0
business_analytics	cancelled_appointments	integer	NO	0
business_analytics	total_revenue	numeric	NO	0
business_analytics	total_customers	integer	NO	0
business_analytics	average_rating	numeric	NO	0
business_analytics	created_at	timestamp with time zone	NO	now()
business_analytics	updated_at	timestamp with time zone	NO	now()
business_availability	id	uuid	NO	gen_random_uuid()
business_availability	business_id	uuid	NO	
business_availability	day_of_week	character varying	NO	
business_availability	start_time	character varying	NO	
business_availability	end_time	character varying	NO	
business_availability	created_at	timestamp with time zone	NO	now()
business_availability	updated_at	timestamp with time zone	NO	now()
business_categories	id	uuid	NO	gen_random_uuid()
business_categories	name	text	NO	
business_categories	description	text	YES	
business_categories	icon	text	YES	
business_categories	created_at	timestamp with time zone	NO	now()
business_category_mapping	id	uuid	NO	gen_random_uuid()
business_category_mapping	business_id	uuid	NO	
business_category_mapping	category_id	uuid	NO	
business_category_mapping	created_at	timestamp with time zone	NO	now()
business_images	id	uuid	NO	gen_random_uuid()
business_images	business_id	uuid	NO	
business_images	image_url	text	NO	
business_images	image_order	integer	NO	0
business_images	is_active	boolean	NO	true
business_images	created_at	timestamp with time zone	NO	now()
business_images	updated_at	timestamp with time zone	NO	now()
business_images	is_approved	boolean	YES	false
business_images	approval_note	text	YES	
business_images	approved_at	timestamp without time zone	YES	
business_images	approved_by	uuid	YES	
business_photos	id	uuid	NO	gen_random_uuid()
business_photos	business_id	uuid	NO	
business_photos	url	text	NO	
business_photos	uploaded_at	timestamp with time zone	YES	now()
business_photos	created_at	timestamp with time zone	NO	now()
business_photos	updated_at	timestamp with time zone	NO	now()
business_ratings	id	uuid	NO	gen_random_uuid()
business_ratings	business_id	uuid	NO	
business_ratings	average_service_rating	numeric	NO	0
business_ratings	average_employee_rating	numeric	NO	0
business_ratings	overall_rating	numeric	NO	0
business_ratings	total_reviews	integer	NO	0
business_ratings	last_6_months_rating	numeric	NO	0
business_ratings	last_updated	timestamp with time zone	NO	now()
business_working_hours	id	uuid	NO	gen_random_uuid()
business_working_hours	business_id	uuid	NO	
business_working_hours	day_of_week	integer	NO	
business_working_hours	start_time	time without time zone	NO	
business_working_hours	end_time	time without time zone	NO	
business_working_hours	is_working_day	boolean	NO	true
business_working_hours	created_at	timestamp with time zone	NO	now()
business_working_hours	updated_at	timestamp with time zone	NO	now()
businesses	id	uuid	NO	gen_random_uuid()
businesses	owner_user_id	uuid	NO	
businesses	name	text	NO	
businesses	description	text	YES	
businesses	address	text	NO	
businesses	latitude	double precision	NO	
businesses	longitude	double precision	NO	
businesses	phone	text	YES	
businesses	email	text	YES	
businesses	created_at	timestamp with time zone	NO	now()
businesses	updated_at	timestamp with time zone	NO	now()
businesses	profile_image_url	text	YES	
businesses	gender_preference	text	NO	'both'::text
businesses	working_hours_enabled	boolean	YES	true
businesses	is_verified	boolean	YES	false
businesses	average_rating	numeric	YES	0
businesses	total_reviews	integer	YES	0
businesses	gender_service	character varying	YES	'unisex'::character varying
businesses	is_approved	boolean	YES	false
businesses	profile_image_approved	boolean	YES	false
businesses	approval_note	text	YES	
businesses	approved_at	timestamp with time zone	YES	
businesses	approved_by	uuid	YES	
customer_preferences	id	uuid	NO	gen_random_uuid()
customer_preferences	user_id	uuid	NO	
customer_preferences	preferred_gender	text	YES	
customer_preferences	max_distance_km	integer	YES	10
customer_preferences	preferred_services	ARRAY	YES	
customer_preferences	notification_preferences	jsonb	YES	'{}'::jsonb
customer_preferences	created_at	timestamp with time zone	NO	now()
customer_preferences	updated_at	timestamp with time zone	NO	now()
email_tokens	id	uuid	NO	gen_random_uuid()
email_tokens	user_id	uuid	NO	
email_tokens	token	text	NO	
email_tokens	type	text	NO	
email_tokens	new_email	text	YES	
email_tokens	expires_at	timestamp with time zone	NO	
email_tokens	used_at	timestamp with time zone	YES	
email_tokens	created_at	timestamp with time zone	NO	now()
employee_availability	id	uuid	NO	gen_random_uuid()
employee_availability	employee_id	uuid	NO	
employee_availability	day_of_week	integer	NO	
employee_availability	start_time	time without time zone	NO	
employee_availability	end_time	time without time zone	NO	
employee_availability	created_at	timestamp with time zone	NO	now()
employee_availability	updated_at	timestamp with time zone	NO	now()
employee_login_logs	id	uuid	NO	gen_random_uuid()
employee_login_logs	employee_id	uuid	NO	
employee_login_logs	login_at	timestamp with time zone	YES	now()
employee_login_logs	ip_address	inet	YES	
employee_login_logs	user_agent	text	YES	
employee_login_logs	login_successful	boolean	YES	true
employee_permissions	id	uuid	NO	gen_random_uuid()
employee_permissions	employee_id	uuid	NO	
employee_permissions	permission_name	character varying	NO	
employee_permissions	is_granted	boolean	YES	true
employee_permissions	created_at	timestamp with time zone	YES	now()
employee_permissions	updated_at	timestamp with time zone	YES	now()
employee_ratings	id	uuid	NO	gen_random_uuid()
employee_ratings	employee_id	uuid	NO	
employee_ratings	average_rating	numeric	NO	0
employee_ratings	total_reviews	integer	NO	0
employee_ratings	last_updated	timestamp with time zone	NO	now()
employee_services	id	uuid	NO	gen_random_uuid()
employee_services	employee_id	uuid	NO	
employee_services	service_id	uuid	NO	
employee_services	created_at	timestamp with time zone	YES	now()
employee_services	updated_at	timestamp with time zone	YES	now()
employees	id	uuid	NO	gen_random_uuid()
employees	business_id	uuid	NO	
employees	name	text	NO	
employees	email	text	YES	
employees	phone	text	YES	
employees	created_at	timestamp with time zone	NO	now()
employees	updated_at	timestamp with time zone	NO	now()
employees	user_id	uuid	YES	
employees	login_email	character varying	YES	
employees	password_hash	character varying	YES	
employees	is_active	boolean	YES	true
employees	permissions	jsonb	YES	'{"can_view_analytics": true, "can_manage_services": false, "can_manage_appointments": true}'::jsonb
employees	created_by_user_id	uuid	YES	
favorites	id	uuid	NO	gen_random_uuid()
favorites	user_id	uuid	NO	
favorites	business_id	uuid	NO	
favorites	created_at	timestamp with time zone	NO	now()
notifications	id	uuid	NO	gen_random_uuid()
notifications	user_id	uuid	NO	
notifications	message	text	NO	
notifications	read	boolean	NO	false
notifications	created_at	timestamp with time zone	NO	now()
notifications	type	character varying	YES	'system'::character varying
push_subscriptions	id	uuid	NO	gen_random_uuid()
push_subscriptions	business_id	uuid	NO	
push_subscriptions	endpoint	text	NO	
push_subscriptions	p256dh	text	NO	
push_subscriptions	auth	text	NO	
push_subscriptions	created_at	timestamp with time zone	YES	now()
push_subscriptions	updated_at	timestamp with time zone	YES	now()
reviews	id	uuid	NO	gen_random_uuid()
reviews	appointment_id	uuid	NO	
reviews	user_id	uuid	NO	
reviews	business_id	uuid	NO	
reviews	service_rating	integer	NO	
reviews	employee_rating	integer	NO	
reviews	comment	text	NO	
reviews	created_at	timestamp with time zone	NO	now()
reviews	updated_at	timestamp with time zone	NO	now()
reviews	photos	ARRAY	NO	'{}'::text[]
reviews	business_reply	text	YES	
reviews	business_reply_at	timestamp without time zone	YES	
reviews	is_approved	boolean	YES	false
reviews	business_reply_approved	boolean	YES	false
reviews	approval_note	text	YES	
reviews	approved_at	timestamp without time zone	YES	
reviews	approved_by	uuid	YES	
service_categories	id	uuid	NO	gen_random_uuid()
service_categories	name	text	NO	
service_categories	description	text	YES	
service_categories	icon	text	YES	
service_categories	created_at	timestamp with time zone	NO	now()
services	id	uuid	NO	gen_random_uuid()
services	business_id	uuid	NO	
services	name	text	NO	
services	description	text	YES	
services	duration_minutes	integer	NO	
services	price	numeric	NO	
services	created_at	timestamp with time zone	NO	now()
services	updated_at	timestamp with time zone	NO	now()
services	category_id	uuid	YES	
stories	id	uuid	NO	gen_random_uuid()
stories	business_id	uuid	NO	
stories	media_url	text	NO	
stories	media_type	character varying	NO	
stories	media_size	integer	YES	
stories	media_duration	integer	YES	
stories	caption	text	YES	
stories	background_color	character varying	YES	'#000000'::character varying
stories	text_color	character varying	YES	'#FFFFFF'::character varying
stories	font_family	character varying	YES	'Arial'::character varying
stories	font_size	integer	YES	16
stories	text_position	character varying	YES	'center'::character varying
stories	filter_type	character varying	YES	'none'::character varying
stories	is_highlighted	boolean	YES	false
stories	is_pinned	boolean	YES	false
stories	view_count	integer	YES	0
stories	like_count	integer	YES	0
stories	comment_count	integer	YES	0
stories	share_count	integer	YES	0
stories	is_active	boolean	YES	true
stories	is_archived	boolean	YES	false
stories	created_at	timestamp with time zone	YES	now()
stories	expires_at	timestamp with time zone	NO	
stories	updated_at	timestamp with time zone	YES	now()
story_archive	id	uuid	NO	gen_random_uuid()
story_archive	original_story_id	uuid	NO	
story_archive	business_id	uuid	NO	
story_archive	media_url	text	NO	
story_archive	media_type	character varying	NO	
story_archive	caption	text	YES	
story_archive	view_count	integer	YES	0
story_archive	like_count	integer	YES	0
story_archive	comment_count	integer	YES	0
story_archive	share_count	integer	YES	0
story_archive	created_at	timestamp with time zone	YES	
story_archive	archived_at	timestamp with time zone	YES	now()
story_archive	archive_reason	character varying	NO	
story_comments	id	uuid	NO	gen_random_uuid()
story_comments	story_id	uuid	NO	
story_comments	user_id	uuid	NO	
story_comments	comment	text	NO	
story_comments	is_approved	boolean	YES	true
story_comments	is_edited	boolean	YES	false
story_comments	edited_at	timestamp with time zone	YES	
story_comments	created_at	timestamp with time zone	YES	now()
story_comments	updated_at	timestamp with time zone	YES	now()
story_daily_stats	id	uuid	NO	gen_random_uuid()
story_daily_stats	business_id	uuid	NO	
story_daily_stats	story_date	date	NO	
story_daily_stats	total_stories	integer	YES	0
story_daily_stats	total_views	integer	YES	0
story_daily_stats	total_likes	integer	YES	0
story_daily_stats	total_comments	integer	YES	0
story_daily_stats	total_shares	integer	YES	0
story_daily_stats	unique_viewers	integer	YES	0
story_daily_stats	avg_view_duration	numeric	YES	0
story_daily_stats	created_at	timestamp with time zone	YES	now()
story_daily_stats	updated_at	timestamp with time zone	YES	now()
story_hashtags	id	uuid	NO	gen_random_uuid()
story_hashtags	story_id	uuid	NO	
story_hashtags	hashtag	character varying	NO	
story_hashtags	created_at	timestamp with time zone	YES	now()
story_likes	id	uuid	NO	gen_random_uuid()
story_likes	story_id	uuid	NO	
story_likes	user_id	uuid	NO	
story_likes	liked_at	timestamp with time zone	YES	now()
story_mentions	id	uuid	NO	gen_random_uuid()
story_mentions	story_id	uuid	NO	
story_mentions	mentioned_user_id	uuid	NO	
story_mentions	mentioned_at	timestamp with time zone	YES	now()
story_reports	id	uuid	NO	gen_random_uuid()
story_reports	story_id	uuid	NO	
story_reports	reporter_user_id	uuid	NO	
story_reports	report_reason	character varying	NO	
story_reports	report_description	text	YES	
story_reports	is_resolved	boolean	YES	false
story_reports	resolved_by	uuid	YES	
story_reports	resolved_at	timestamp with time zone	YES	
story_reports	created_at	timestamp with time zone	YES	now()
story_shares	id	uuid	NO	gen_random_uuid()
story_shares	story_id	uuid	NO	
story_shares	user_id	uuid	NO	
story_shares	share_type	character varying	NO	
story_shares	shared_at	timestamp with time zone	YES	now()
story_shares	external_platform	character varying	YES	
story_shares	share_message	text	YES	
story_views	id	uuid	NO	gen_random_uuid()
story_views	story_id	uuid	NO	
story_views	user_id	uuid	NO	
story_views	viewed_at	timestamp with time zone	YES	now()
story_views	view_duration	integer	YES	
story_views	device_type	character varying	YES	
story_views	ip_address	inet	YES	
story_views	user_agent	text	YES	
support_tickets	id	uuid	NO	gen_random_uuid()
support_tickets	user_id	uuid	NO	
support_tickets	user_email	text	NO	
support_tickets	user_name	text	NO	
support_tickets	user_type	text	NO	
support_tickets	subject	text	NO	
support_tickets	message	text	NO	
support_tickets	category	text	NO	
support_tickets	priority	text	NO	
support_tickets	status	text	NO	'open'::text
support_tickets	created_at	timestamp with time zone	YES	now()
support_tickets	updated_at	timestamp with time zone	YES	now()
user_push_subscriptions	id	uuid	NO	uuid_generate_v4()
user_push_subscriptions	user_id	uuid	NO	
user_push_subscriptions	endpoint	text	NO	
user_push_subscriptions	p256dh	text	NO	
user_push_subscriptions	auth	text	NO	
user_push_subscriptions	created_at	timestamp with time zone	YES	now()
user_push_subscriptions	updated_at	timestamp with time zone	YES	now()
users	id	uuid	NO	gen_random_uuid()
users	name	text	NO	
users	email	text	NO	
users	password_hash	text	NO	
users	role	text	NO	
users	created_at	timestamp with time zone	NO	now()
users	updated_at	timestamp with time zone	NO	now()
users	phone	text	YES	
users	address	text	YES	
users	latitude	double precision	YES	
users	longitude	double precision	YES	
users	business_id	uuid	YES	
users	employee_id	uuid	YES	
users	is_employee_active	boolean	YES	true
users	profile_image_url	text	YES	

-- Constraints
appointment_notes	appointment_notes_appointment_id_fkey	FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
appointment_notes	appointment_notes_created_by_fkey	FOREIGN KEY (created_by) REFERENCES users(id)
appointment_notes	appointment_notes_pkey	PRIMARY KEY (id)
appointment_reschedule_requests	appointment_reschedule_requests_appointment_id_fkey	FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
appointment_reschedule_requests	appointment_reschedule_requests_approved_by_user_id_fkey	FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
appointment_reschedule_requests	appointment_reschedule_requests_new_employee_id_fkey	FOREIGN KEY (new_employee_id) REFERENCES employees(id)
appointment_reschedule_requests	appointment_reschedule_requests_old_employee_id_fkey	FOREIGN KEY (old_employee_id) REFERENCES employees(id)
appointment_reschedule_requests	appointment_reschedule_requests_pkey	PRIMARY KEY (id)
appointment_reschedule_requests	appointment_reschedule_requests_requested_by_role_check	CHECK ((requested_by_role = ANY (ARRAY['user'::text, 'business'::text, 'employee'::text])))
appointment_reschedule_requests	appointment_reschedule_requests_requested_by_user_id_fkey	FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE CASCADE
appointment_reschedule_requests	appointment_reschedule_requests_status_check	CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])))
appointments	appointments_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
appointments	appointments_employee_id_fkey	FOREIGN KEY (employee_id) REFERENCES employees(id)
appointments	appointments_pkey	PRIMARY KEY (id)
appointments	appointments_reschedule_status_check	CHECK ((reschedule_status = ANY (ARRAY['none'::text, 'pending'::text, 'approved'::text, 'rejected'::text])))
appointments	appointments_status_check	CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text])))
appointment_services	appointment_services_appointment_id_fkey	FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
appointment_services	appointment_services_employee_id_fkey	FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
appointment_services	appointment_services_pkey	PRIMARY KEY (id)
appointment_services	appointment_services_service_id_fkey	FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
appointment_services	fk_appointment_services_employee	FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
audit_logs	audit_logs_pkey	PRIMARY KEY (id)
audit_logs	audit_logs_user_id_fkey	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
business_analytics	business_analytics_business_id_date_key	UNIQUE (business_id, date)
business_analytics	business_analytics_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
business_analytics	business_analytics_pkey	PRIMARY KEY (id)
business_availability	business_availability_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
business_availability	business_availability_pkey	PRIMARY KEY (id)
business_categories	business_categories_name_key	UNIQUE (name)
business_categories	business_categories_pkey	PRIMARY KEY (id)
business_category_mapping	business_category_mapping_business_id_category_id_key	UNIQUE (business_id, category_id)
business_category_mapping	business_category_mapping_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
business_category_mapping	business_category_mapping_category_id_fkey	FOREIGN KEY (category_id) REFERENCES business_categories(id) ON DELETE CASCADE
business_category_mapping	business_category_mapping_pkey	PRIMARY KEY (id)
businesses	businesses_approved_by_fkey	FOREIGN KEY (approved_by) REFERENCES users(id)
businesses	businesses_gender_preference_check	CHECK ((gender_preference = ANY (ARRAY['male'::text, 'female'::text, 'both'::text])))
businesses	businesses_gender_service_check	CHECK (((gender_service)::text = ANY (ARRAY[('male'::character varying)::text, ('female'::character varying)::text, ('unisex'::character varying)::text])))
businesses	businesses_owner_user_id_fkey	FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
businesses	businesses_pkey	PRIMARY KEY (id)
business_images	business_images_approved_by_fkey	FOREIGN KEY (approved_by) REFERENCES users(id)
business_images	business_images_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
business_images	business_images_pkey	PRIMARY KEY (id)
business_photos	business_photos_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
business_photos	business_photos_pkey	PRIMARY KEY (id)
business_ratings	business_ratings_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
business_ratings	business_ratings_business_id_key	UNIQUE (business_id)
business_ratings	business_ratings_pkey	PRIMARY KEY (id)
business_working_hours	business_working_hours_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
business_working_hours	business_working_hours_day_of_week_check	CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
business_working_hours	business_working_hours_pkey	PRIMARY KEY (id)
customer_preferences	customer_preferences_pkey	PRIMARY KEY (id)
customer_preferences	customer_preferences_preferred_gender_check	CHECK ((preferred_gender = ANY (ARRAY['male'::text, 'female'::text, 'both'::text])))
customer_preferences	customer_preferences_user_id_fkey	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
customer_preferences	customer_preferences_user_id_key	UNIQUE (user_id)
email_tokens	email_tokens_pkey	PRIMARY KEY (id)
email_tokens	email_tokens_token_key	UNIQUE (token)
email_tokens	email_tokens_type_check	CHECK ((type = ANY (ARRAY['reset'::text, 'verify'::text, 'email_change'::text])))
email_tokens	email_tokens_user_id_fkey	FOREIGN KEY (user_id) REFERENCES users(id)
email_tokens	email_tokens_user_id_type_token_key	UNIQUE (user_id, type, token)
employee_availability	employee_availability_day_of_week_check	CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
employee_availability	employee_availability_employee_id_fkey	FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
employee_availability	employee_availability_pkey	PRIMARY KEY (id)
employee_availability	fk_employee_availability_employee	FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
employee_login_logs	employee_login_logs_employee_id_fkey	FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
employee_login_logs	employee_login_logs_pkey	PRIMARY KEY (id)
employee_permissions	employee_permissions_employee_id_fkey	FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
employee_permissions	employee_permissions_employee_id_permission_name_key	UNIQUE (employee_id, permission_name)
employee_permissions	employee_permissions_pkey	PRIMARY KEY (id)
employee_ratings	employee_ratings_employee_id_fkey	FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
employee_ratings	employee_ratings_employee_id_key	UNIQUE (employee_id)
employee_ratings	employee_ratings_pkey	PRIMARY KEY (id)
employees	employees_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
employees	employees_created_by_user_id_fkey	FOREIGN KEY (created_by_user_id) REFERENCES users(id)
employees	employees_login_email_key	UNIQUE (login_email)
employees	employees_pkey	PRIMARY KEY (id)
employees	employees_user_id_fkey	FOREIGN KEY (user_id) REFERENCES users(id)
employee_services	employee_services_employee_id_fkey	FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
employee_services	employee_services_employee_id_service_id_key	UNIQUE (employee_id, service_id)
employee_services	employee_services_pkey	PRIMARY KEY (id)
employee_services	employee_services_service_id_fkey	FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
favorites	favorites_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
favorites	favorites_pkey	PRIMARY KEY (id)
favorites	favorites_user_id_business_id_key	UNIQUE (user_id, business_id)
favorites	favorites_user_id_fkey	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
notifications	notifications_pkey	PRIMARY KEY (id)
notifications	notifications_user_id_fkey	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
push_subscriptions	push_subscriptions_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
push_subscriptions	push_subscriptions_pkey	PRIMARY KEY (id)
reviews	reviews_appointment_id_fkey	FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
reviews	reviews_appointment_id_key	UNIQUE (appointment_id)
reviews	reviews_approved_by_fkey	FOREIGN KEY (approved_by) REFERENCES users(id)
reviews	reviews_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
reviews	reviews_comment_check	CHECK ((length(comment) >= 20))
reviews	reviews_employee_rating_check	CHECK (((employee_rating >= 1) AND (employee_rating <= 5)))
reviews	reviews_pkey	PRIMARY KEY (id)
reviews	reviews_service_rating_check	CHECK (((service_rating >= 1) AND (service_rating <= 5)))
reviews	reviews_user_id_fkey	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
service_categories	service_categories_name_key	UNIQUE (name)
service_categories	service_categories_pkey	PRIMARY KEY (id)
services	services_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
services	services_category_id_fkey	FOREIGN KEY (category_id) REFERENCES service_categories(id)
services	services_pkey	PRIMARY KEY (id)
stories	stories_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
stories	stories_media_type_check	CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying])::text[])))
stories	stories_pkey	PRIMARY KEY (id)
story_archive	story_archive_archive_reason_check	CHECK (((archive_reason)::text = ANY ((ARRAY['expired'::character varying, 'deleted'::character varying, 'reported'::character varying, 'admin_removed'::character varying])::text[])))
story_archive	story_archive_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
story_archive	story_archive_pkey	PRIMARY KEY (id)
story_comments	story_comments_comment_check	CHECK ((length(comment) <= 200))
story_comments	story_comments_pkey	PRIMARY KEY (id)
story_comments	story_comments_story_id_fkey	FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
story_comments	story_comments_user_id_fkey	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
story_daily_stats	story_daily_stats_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
story_daily_stats	story_daily_stats_business_id_story_date_key	UNIQUE (business_id, story_date)
story_daily_stats	story_daily_stats_pkey	PRIMARY KEY (id)
story_hashtags	story_hashtags_hashtag_check	CHECK (((length((hashtag)::text) >= 2) AND (length((hashtag)::text) <= 50)))
story_hashtags	story_hashtags_pkey	PRIMARY KEY (id)
story_hashtags	story_hashtags_story_id_fkey	FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
story_hashtags	story_hashtags_story_id_hashtag_key	UNIQUE (story_id, hashtag)
story_likes	story_likes_pkey	PRIMARY KEY (id)
story_likes	story_likes_story_id_fkey	FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
story_likes	story_likes_story_id_user_id_key	UNIQUE (story_id, user_id)
story_likes	story_likes_user_id_fkey	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
story_mentions	story_mentions_mentioned_user_id_fkey	FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE
story_mentions	story_mentions_pkey	PRIMARY KEY (id)
story_mentions	story_mentions_story_id_fkey	FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
story_mentions	story_mentions_story_id_mentioned_user_id_key	UNIQUE (story_id, mentioned_user_id)
story_reports	story_reports_pkey	PRIMARY KEY (id)
story_reports	story_reports_report_reason_check	CHECK (((report_reason)::text = ANY ((ARRAY['spam'::character varying, 'inappropriate'::character varying, 'harassment'::character varying, 'violence'::character varying, 'fake'::character varying, 'other'::character varying])::text[])))
story_reports	story_reports_reporter_user_id_fkey	FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE
story_reports	story_reports_resolved_by_fkey	FOREIGN KEY (resolved_by) REFERENCES users(id)
story_reports	story_reports_story_id_fkey	FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
story_reports	story_reports_story_id_reporter_user_id_key	UNIQUE (story_id, reporter_user_id)
story_shares	story_shares_pkey	PRIMARY KEY (id)
story_shares	story_shares_share_type_check	CHECK (((share_type)::text = ANY ((ARRAY['internal'::character varying, 'external'::character varying, 'copy_link'::character varying])::text[])))
story_shares	story_shares_story_id_fkey	FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
story_shares	story_shares_user_id_fkey	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
story_views	story_views_pkey	PRIMARY KEY (id)
story_views	story_views_story_id_fkey	FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
story_views	story_views_story_id_user_id_key	UNIQUE (story_id, user_id)
story_views	story_views_user_id_fkey	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
support_tickets	support_tickets_category_check	CHECK ((category = ANY (ARRAY['general'::text, 'business'::text, 'technical'::text, 'billing'::text])))
support_tickets	support_tickets_pkey	PRIMARY KEY (id)
support_tickets	support_tickets_priority_check	CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
support_tickets	support_tickets_status_check	CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))
support_tickets	support_tickets_user_type_check	CHECK ((user_type = ANY (ARRAY['user'::text, 'business'::text])))
user_push_subscriptions	user_push_subscriptions_pkey	PRIMARY KEY (id)
user_push_subscriptions	user_push_subscriptions_user_id_endpoint_key	UNIQUE (user_id, endpoint)
user_push_subscriptions	user_push_subscriptions_user_id_fkey	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
users	users_business_id_fkey	FOREIGN KEY (business_id) REFERENCES businesses(id)
users	users_email_key	UNIQUE (email)
users	users_employee_id_fkey	FOREIGN KEY (employee_id) REFERENCES employees(id)
users	users_pkey	PRIMARY KEY (id)
users	users_role_check	CHECK ((role = ANY (ARRAY['user'::text, 'business'::text, 'admin'::text])))

-- Indexes
appointment_notes	appointment_notes_pkey	CREATE UNIQUE INDEX appointment_notes_pkey ON public.appointment_notes USING btree (id)
appointment_notes	idx_appointment_notes_appointment_id	CREATE INDEX idx_appointment_notes_appointment_id ON public.appointment_notes USING btree (appointment_id)
appointment_reschedule_requests	appointment_reschedule_requests_pkey	CREATE UNIQUE INDEX appointment_reschedule_requests_pkey ON public.appointment_reschedule_requests USING btree (id)
appointment_reschedule_requests	idx_appointment_reschedule_requests_appointment_id	CREATE INDEX idx_appointment_reschedule_requests_appointment_id ON public.appointment_reschedule_requests USING btree (appointment_id)
appointment_reschedule_requests	idx_appointment_reschedule_requests_created_at	CREATE INDEX idx_appointment_reschedule_requests_created_at ON public.appointment_reschedule_requests USING btree (created_at)
appointment_reschedule_requests	idx_appointment_reschedule_requests_requested_by	CREATE INDEX idx_appointment_reschedule_requests_requested_by ON public.appointment_reschedule_requests USING btree (requested_by_user_id)
appointment_reschedule_requests	idx_appointment_reschedule_requests_status	CREATE INDEX idx_appointment_reschedule_requests_status ON public.appointment_reschedule_requests USING btree (status)
appointment_services	appointment_services_pkey	CREATE UNIQUE INDEX appointment_services_pkey ON public.appointment_services USING btree (id)
appointment_services	idx_appointment_services_employee_id	CREATE INDEX idx_appointment_services_employee_id ON public.appointment_services USING btree (employee_id)
appointments	appointments_pkey	CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id)
appointments	idx_appointments_business_id	CREATE INDEX idx_appointments_business_id ON public.appointments USING btree (business_id)
appointments	idx_appointments_reschedule_status	CREATE INDEX idx_appointments_reschedule_status ON public.appointments USING btree (reschedule_status)
appointments	idx_appointments_user_id	CREATE INDEX idx_appointments_user_id ON public.appointments USING btree (user_id)
audit_logs	audit_logs_pkey	CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)
audit_logs	idx_audit_logs_user_id	CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id)
business_analytics	business_analytics_business_id_date_key	CREATE UNIQUE INDEX business_analytics_business_id_date_key ON public.business_analytics USING btree (business_id, date)
business_analytics	business_analytics_pkey	CREATE UNIQUE INDEX business_analytics_pkey ON public.business_analytics USING btree (id)
business_analytics	idx_business_analytics_business_id	CREATE INDEX idx_business_analytics_business_id ON public.business_analytics USING btree (business_id)
business_analytics	idx_business_analytics_date	CREATE INDEX idx_business_analytics_date ON public.business_analytics USING btree (date)
business_availability	business_availability_pkey	CREATE UNIQUE INDEX business_availability_pkey ON public.business_availability USING btree (id)
business_categories	business_categories_name_key	CREATE UNIQUE INDEX business_categories_name_key ON public.business_categories USING btree (name)
business_categories	business_categories_pkey	CREATE UNIQUE INDEX business_categories_pkey ON public.business_categories USING btree (id)
business_category_mapping	business_category_mapping_business_id_category_id_key	CREATE UNIQUE INDEX business_category_mapping_business_id_category_id_key ON public.business_category_mapping USING btree (business_id, category_id)
business_category_mapping	business_category_mapping_pkey	CREATE UNIQUE INDEX business_category_mapping_pkey ON public.business_category_mapping USING btree (id)
business_category_mapping	idx_business_category_mapping_business_id	CREATE INDEX idx_business_category_mapping_business_id ON public.business_category_mapping USING btree (business_id)
business_category_mapping	idx_business_category_mapping_category_id	CREATE INDEX idx_business_category_mapping_category_id ON public.business_category_mapping USING btree (category_id)
business_images	business_images_pkey	CREATE UNIQUE INDEX business_images_pkey ON public.business_images USING btree (id)
business_images	idx_business_images_business_id	CREATE INDEX idx_business_images_business_id ON public.business_images USING btree (business_id)
business_photos	business_photos_pkey	CREATE UNIQUE INDEX business_photos_pkey ON public.business_photos USING btree (id)
business_ratings	business_ratings_business_id_key	CREATE UNIQUE INDEX business_ratings_business_id_key ON public.business_ratings USING btree (business_id)
business_ratings	business_ratings_pkey	CREATE UNIQUE INDEX business_ratings_pkey ON public.business_ratings USING btree (id)
business_ratings	idx_business_ratings_business_id	CREATE INDEX idx_business_ratings_business_id ON public.business_ratings USING btree (business_id)
business_working_hours	business_working_hours_pkey	CREATE UNIQUE INDEX business_working_hours_pkey ON public.business_working_hours USING btree (id)
business_working_hours	idx_business_working_hours_business_id	CREATE INDEX idx_business_working_hours_business_id ON public.business_working_hours USING btree (business_id)
businesses	businesses_pkey	CREATE UNIQUE INDEX businesses_pkey ON public.businesses USING btree (id)
businesses	idx_businesses_owner_user_id	CREATE INDEX idx_businesses_owner_user_id ON public.businesses USING btree (owner_user_id)
customer_preferences	customer_preferences_pkey	CREATE UNIQUE INDEX customer_preferences_pkey ON public.customer_preferences USING btree (id)
customer_preferences	customer_preferences_user_id_key	CREATE UNIQUE INDEX customer_preferences_user_id_key ON public.customer_preferences USING btree (user_id)
customer_preferences	idx_customer_preferences_user_id	CREATE INDEX idx_customer_preferences_user_id ON public.customer_preferences USING btree (user_id)
email_tokens	email_tokens_pkey	CREATE UNIQUE INDEX email_tokens_pkey ON public.email_tokens USING btree (id)
email_tokens	email_tokens_token_key	CREATE UNIQUE INDEX email_tokens_token_key ON public.email_tokens USING btree (token)
email_tokens	email_tokens_user_id_type_token_key	CREATE UNIQUE INDEX email_tokens_user_id_type_token_key ON public.email_tokens USING btree (user_id, type, token)
email_tokens	idx_email_tokens_expires_at	CREATE INDEX idx_email_tokens_expires_at ON public.email_tokens USING btree (expires_at)
email_tokens	idx_email_tokens_token	CREATE INDEX idx_email_tokens_token ON public.email_tokens USING btree (token)
email_tokens	idx_email_tokens_type	CREATE INDEX idx_email_tokens_type ON public.email_tokens USING btree (type)
email_tokens	idx_email_tokens_user_id	CREATE INDEX idx_email_tokens_user_id ON public.email_tokens USING btree (user_id)
employee_availability	employee_availability_pkey	CREATE UNIQUE INDEX employee_availability_pkey ON public.employee_availability USING btree (id)
employee_availability	idx_employee_availability_day	CREATE INDEX idx_employee_availability_day ON public.employee_availability USING btree (day_of_week)
employee_availability	idx_employee_availability_employee_id	CREATE INDEX idx_employee_availability_employee_id ON public.employee_availability USING btree (employee_id)
employee_login_logs	employee_login_logs_pkey	CREATE UNIQUE INDEX employee_login_logs_pkey ON public.employee_login_logs USING btree (id)
employee_login_logs	idx_employee_login_logs_employee_id	CREATE INDEX idx_employee_login_logs_employee_id ON public.employee_login_logs USING btree (employee_id)
employee_login_logs	idx_employee_login_logs_login_at	CREATE INDEX idx_employee_login_logs_login_at ON public.employee_login_logs USING btree (login_at)
employee_permissions	employee_permissions_employee_id_permission_name_key	CREATE UNIQUE INDEX employee_permissions_employee_id_permission_name_key ON public.employee_permissions USING btree (employee_id, permission_name)
employee_permissions	employee_permissions_pkey	CREATE UNIQUE INDEX employee_permissions_pkey ON public.employee_permissions USING btree (id)
employee_permissions	idx_employee_permissions_employee_id	CREATE INDEX idx_employee_permissions_employee_id ON public.employee_permissions USING btree (employee_id)
employee_permissions	idx_employee_permissions_name	CREATE INDEX idx_employee_permissions_name ON public.employee_permissions USING btree (permission_name)
employee_ratings	employee_ratings_employee_id_key	CREATE UNIQUE INDEX employee_ratings_employee_id_key ON public.employee_ratings USING btree (employee_id)
employee_ratings	employee_ratings_pkey	CREATE UNIQUE INDEX employee_ratings_pkey ON public.employee_ratings USING btree (id)
employee_ratings	idx_employee_ratings_employee_id	CREATE INDEX idx_employee_ratings_employee_id ON public.employee_ratings USING btree (employee_id)
employee_services	employee_services_employee_id_service_id_key	CREATE UNIQUE INDEX employee_services_employee_id_service_id_key ON public.employee_services USING btree (employee_id, service_id)
employee_services	employee_services_pkey	CREATE UNIQUE INDEX employee_services_pkey ON public.employee_services USING btree (id)
employees	employees_login_email_key	CREATE UNIQUE INDEX employees_login_email_key ON public.employees USING btree (login_email)
employees	employees_pkey	CREATE UNIQUE INDEX employees_pkey ON public.employees USING btree (id)
employees	idx_employees_business_id	CREATE INDEX idx_employees_business_id ON public.employees USING btree (business_id)
employees	idx_employees_created_by	CREATE INDEX idx_employees_created_by ON public.employees USING btree (created_by_user_id)
employees	idx_employees_is_active	CREATE INDEX idx_employees_is_active ON public.employees USING btree (is_active)
employees	idx_employees_login_email	CREATE INDEX idx_employees_login_email ON public.employees USING btree (login_email)
employees	idx_employees_user_id	CREATE INDEX idx_employees_user_id ON public.employees USING btree (user_id)
favorites	favorites_pkey	CREATE UNIQUE INDEX favorites_pkey ON public.favorites USING btree (id)
favorites	favorites_user_id_business_id_key	CREATE UNIQUE INDEX favorites_user_id_business_id_key ON public.favorites USING btree (user_id, business_id)
notifications	idx_notifications_created_at	CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at)
notifications	idx_notifications_read	CREATE INDEX idx_notifications_read ON public.notifications USING btree (read)
notifications	idx_notifications_user_id	CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id)
notifications	notifications_pkey	CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)
push_subscriptions	push_subscriptions_business_endpoint_idx	CREATE UNIQUE INDEX push_subscriptions_business_endpoint_idx ON public.push_subscriptions USING btree (business_id, endpoint)
push_subscriptions	push_subscriptions_pkey	CREATE UNIQUE INDEX push_subscriptions_pkey ON public.push_subscriptions USING btree (id)
reviews	idx_reviews_appointment_id	CREATE INDEX idx_reviews_appointment_id ON public.reviews USING btree (appointment_id)
reviews	idx_reviews_business_id	CREATE INDEX idx_reviews_business_id ON public.reviews USING btree (business_id)
reviews	idx_reviews_created_at	CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at)
reviews	idx_reviews_user_id	CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id)
reviews	reviews_appointment_id_key	CREATE UNIQUE INDEX reviews_appointment_id_key ON public.reviews USING btree (appointment_id)
reviews	reviews_pkey	CREATE UNIQUE INDEX reviews_pkey ON public.reviews USING btree (id)
service_categories	service_categories_name_key	CREATE UNIQUE INDEX service_categories_name_key ON public.service_categories USING btree (name)
service_categories	service_categories_pkey	CREATE UNIQUE INDEX service_categories_pkey ON public.service_categories USING btree (id)
services	idx_services_business_id	CREATE INDEX idx_services_business_id ON public.services USING btree (business_id)
services	idx_services_category_id	CREATE INDEX idx_services_category_id ON public.services USING btree (category_id)
services	services_pkey	CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id)
stories	idx_stories_business_active	CREATE INDEX idx_stories_business_active ON public.stories USING btree (business_id, is_active)
stories	idx_stories_business_id	CREATE INDEX idx_stories_business_id ON public.stories USING btree (business_id)
stories	idx_stories_created_at	CREATE INDEX idx_stories_created_at ON public.stories USING btree (created_at DESC)
stories	idx_stories_expires_at	CREATE INDEX idx_stories_expires_at ON public.stories USING btree (expires_at)
stories	idx_stories_is_active	CREATE INDEX idx_stories_is_active ON public.stories USING btree (is_active)
stories	idx_stories_is_highlighted	CREATE INDEX idx_stories_is_highlighted ON public.stories USING btree (is_highlighted)
stories	idx_stories_media_type	CREATE INDEX idx_stories_media_type ON public.stories USING btree (media_type)
stories	stories_pkey	CREATE UNIQUE INDEX stories_pkey ON public.stories USING btree (id)
story_archive	idx_story_archive_archive_reason	CREATE INDEX idx_story_archive_archive_reason ON public.story_archive USING btree (archive_reason)
story_archive	idx_story_archive_archived_at	CREATE INDEX idx_story_archive_archived_at ON public.story_archive USING btree (archived_at DESC)
story_archive	idx_story_archive_business_id	CREATE INDEX idx_story_archive_business_id ON public.story_archive USING btree (business_id)
story_archive	story_archive_pkey	CREATE UNIQUE INDEX story_archive_pkey ON public.story_archive USING btree (id)
story_comments	idx_story_comments_created_at	CREATE INDEX idx_story_comments_created_at ON public.story_comments USING btree (created_at DESC)
story_comments	idx_story_comments_is_approved	CREATE INDEX idx_story_comments_is_approved ON public.story_comments USING btree (is_approved)
story_comments	idx_story_comments_story_id	CREATE INDEX idx_story_comments_story_id ON public.story_comments USING btree (story_id)
story_comments	idx_story_comments_user_id	CREATE INDEX idx_story_comments_user_id ON public.story_comments USING btree (user_id)
story_comments	story_comments_pkey	CREATE UNIQUE INDEX story_comments_pkey ON public.story_comments USING btree (id)
story_daily_stats	idx_story_daily_stats_business_date	CREATE INDEX idx_story_daily_stats_business_date ON public.story_daily_stats USING btree (business_id, story_date)
story_daily_stats	idx_story_daily_stats_business_id	CREATE INDEX idx_story_daily_stats_business_id ON public.story_daily_stats USING btree (business_id)
story_daily_stats	idx_story_daily_stats_story_date	CREATE INDEX idx_story_daily_stats_story_date ON public.story_daily_stats USING btree (story_date DESC)
story_daily_stats	story_daily_stats_business_id_story_date_key	CREATE UNIQUE INDEX story_daily_stats_business_id_story_date_key ON public.story_daily_stats USING btree (business_id, story_date)
story_daily_stats	story_daily_stats_pkey	CREATE UNIQUE INDEX story_daily_stats_pkey ON public.story_daily_stats USING btree (id)
story_hashtags	idx_story_hashtags_hashtag	CREATE INDEX idx_story_hashtags_hashtag ON public.story_hashtags USING btree (hashtag)
story_hashtags	idx_story_hashtags_hashtag_lower	CREATE INDEX idx_story_hashtags_hashtag_lower ON public.story_hashtags USING btree (lower((hashtag)::text))
story_hashtags	idx_story_hashtags_story_id	CREATE INDEX idx_story_hashtags_story_id ON public.story_hashtags USING btree (story_id)
story_hashtags	story_hashtags_pkey	CREATE UNIQUE INDEX story_hashtags_pkey ON public.story_hashtags USING btree (id)
story_hashtags	story_hashtags_story_id_hashtag_key	CREATE UNIQUE INDEX story_hashtags_story_id_hashtag_key ON public.story_hashtags USING btree (story_id, hashtag)
story_likes	idx_story_likes_story_id	CREATE INDEX idx_story_likes_story_id ON public.story_likes USING btree (story_id)
story_likes	idx_story_likes_story_user	CREATE INDEX idx_story_likes_story_user ON public.story_likes USING btree (story_id, user_id)
story_likes	idx_story_likes_user_id	CREATE INDEX idx_story_likes_user_id ON public.story_likes USING btree (user_id)
story_likes	story_likes_pkey	CREATE UNIQUE INDEX story_likes_pkey ON public.story_likes USING btree (id)
story_likes	story_likes_story_id_user_id_key	CREATE UNIQUE INDEX story_likes_story_id_user_id_key ON public.story_likes USING btree (story_id, user_id)
story_mentions	idx_story_mentions_mentioned_user	CREATE INDEX idx_story_mentions_mentioned_user ON public.story_mentions USING btree (mentioned_user_id)
story_mentions	idx_story_mentions_story_id	CREATE INDEX idx_story_mentions_story_id ON public.story_mentions USING btree (story_id)
story_mentions	story_mentions_pkey	CREATE UNIQUE INDEX story_mentions_pkey ON public.story_mentions USING btree (id)
story_mentions	story_mentions_story_id_mentioned_user_id_key	CREATE UNIQUE INDEX story_mentions_story_id_mentioned_user_id_key ON public.story_mentions USING btree (story_id, mentioned_user_id)
story_reports	idx_story_reports_is_resolved	CREATE INDEX idx_story_reports_is_resolved ON public.story_reports USING btree (is_resolved)
story_reports	idx_story_reports_reporter	CREATE INDEX idx_story_reports_reporter ON public.story_reports USING btree (reporter_user_id)
story_reports	idx_story_reports_story_id	CREATE INDEX idx_story_reports_story_id ON public.story_reports USING btree (story_id)
story_reports	story_reports_pkey	CREATE UNIQUE INDEX story_reports_pkey ON public.story_reports USING btree (id)
story_reports	story_reports_story_id_reporter_user_id_key	CREATE UNIQUE INDEX story_reports_story_id_reporter_user_id_key ON public.story_reports USING btree (story_id, reporter_user_id)
story_shares	idx_story_shares_shared_at	CREATE INDEX idx_story_shares_shared_at ON public.story_shares USING btree (shared_at DESC)
story_shares	idx_story_shares_story_id	CREATE INDEX idx_story_shares_story_id ON public.story_shares USING btree (story_id)
story_shares	idx_story_shares_user_id	CREATE INDEX idx_story_shares_user_id ON public.story_shares USING btree (user_id)
story_shares	story_shares_pkey	CREATE UNIQUE INDEX story_shares_pkey ON public.story_shares USING btree (id)
story_views	idx_story_views_story_id	CREATE INDEX idx_story_views_story_id ON public.story_views USING btree (story_id)
story_views	idx_story_views_story_user	CREATE INDEX idx_story_views_story_user ON public.story_views USING btree (story_id, user_id)
story_views	idx_story_views_user_id	CREATE INDEX idx_story_views_user_id ON public.story_views USING btree (user_id)
story_views	idx_story_views_viewed_at	CREATE INDEX idx_story_views_viewed_at ON public.story_views USING btree (viewed_at DESC)
story_views	story_views_pkey	CREATE UNIQUE INDEX story_views_pkey ON public.story_views USING btree (id)
story_views	story_views_story_id_user_id_key	CREATE UNIQUE INDEX story_views_story_id_user_id_key ON public.story_views USING btree (story_id, user_id)
support_tickets	support_tickets_pkey	CREATE UNIQUE INDEX support_tickets_pkey ON public.support_tickets USING btree (id)
user_push_subscriptions	idx_user_push_subscriptions_user_id	CREATE INDEX idx_user_push_subscriptions_user_id ON public.user_push_subscriptions USING btree (user_id)
user_push_subscriptions	user_push_subscriptions_pkey	CREATE UNIQUE INDEX user_push_subscriptions_pkey ON public.user_push_subscriptions USING btree (id)
user_push_subscriptions	user_push_subscriptions_user_id_endpoint_key	CREATE UNIQUE INDEX user_push_subscriptions_user_id_endpoint_key ON public.user_push_subscriptions USING btree (user_id, endpoint)
users	idx_users_business_id	CREATE INDEX idx_users_business_id ON public.users USING btree (business_id)
users	idx_users_employee_id	CREATE INDEX idx_users_employee_id ON public.users USING btree (employee_id)
users	idx_users_is_employee_active	CREATE INDEX idx_users_is_employee_active ON public.users USING btree (is_employee_active)
users	idx_users_role	CREATE INDEX idx_users_role ON public.users USING btree (role)
users	users_email_key	CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)
users	users_pkey	CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)
