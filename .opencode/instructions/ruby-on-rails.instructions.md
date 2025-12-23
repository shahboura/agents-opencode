---
description: Ruby on Rails best practices with MVC, ActiveRecord, and testing
applyTo: '**/*.rb'
---

# Ruby on Rails Instructions

## MVC Architecture

**Follow Rails conventions:**
- Models handle data and business logic
- Views handle presentation
- Controllers handle HTTP requests and responses
- Use RESTful routing
- Keep controllers thin, models fat

**Controller structure:**
```ruby
class UsersController < ApplicationController
  before_action :set_user, only: %i[show edit update destroy]

  def index
    @users = User.all.page(params[:page])
  end

  def show
    # @user is set by before_action
  end

  def create
    @user = User.new(user_params)

    if @user.save
      redirect_to @user, notice: 'User was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def set_user
    @user = User.find(params[:id])
  end

  def user_params
    params.require(:user).permit(:name, :email, :password)
  end
end
```

## ActiveRecord Models

**Use ActiveRecord associations and validations:**
```ruby
class User < ApplicationRecord
  # Associations
  has_many :posts, dependent: :destroy
  has_many :comments, through: :posts
  belongs_to :organization, optional: true

  # Validations
  validates :name, presence: true, length: { minimum: 2, maximum: 50 }
  validates :email, presence: true,
                   uniqueness: { case_sensitive: false },
                   format: { with: URI::MailTo::EMAIL_REGEXP }

  # Callbacks
  before_save :normalize_email
  after_create :send_welcome_email

  # Scopes
  scope :active, -> { where(active: true) }
  scope :recent, -> { where('created_at > ?', 1.week.ago) }

  # Instance methods
  def full_name
    "#{first_name} #{last_name}".strip
  end

  def active?
    active
  end

  private

  def normalize_email
    self.email = email.downcase.strip
  end

  def send_welcome_email
    UserMailer.welcome_email(self).deliver_later
  end
end
```

## Service Objects

**Extract complex business logic:**
```ruby
# app/services/user_registration_service.rb
class UserRegistrationService
  attr_reader :user, :errors

  def initialize(user_params)
    @user_params = user_params
    @user = nil
    @errors = []
  end

  def call
    ActiveRecord::Base.transaction do
      create_user
      send_confirmation_email
      create_default_settings
    end

    @user
  rescue ActiveRecord::RecordInvalid => e
    @errors << e.message
    false
  end

  private

  def create_user
    @user = User.create!(@user_params)
  end

  def send_confirmation_email
    UserMailer.confirmation_email(@user).deliver_later
  end

  def create_default_settings
    UserSetting.create!(user: @user, theme: 'light', notifications: true)
  end
end

# Usage in controller
def create
  service = UserRegistrationService.new(user_params)

  if service.call
    redirect_to service.user, notice: 'User created successfully!'
  else
    @user = User.new(user_params)
    flash.now[:alert] = service.errors.join(', ')
    render :new
  end
end
```

## Testing

**Use RSpec with proper test structure:**
```ruby
# spec/models/user_spec.rb
require 'rails_helper'

RSpec.describe User, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:name) }
    it { should validate_length_of(:name).is_at_least(2).is_at_most(50) }
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }
  end

  describe 'associations' do
    it { should have_many(:posts).dependent(:destroy) }
    it { should belong_to(:organization).optional }
  end

  describe '#full_name' do
    it 'returns first and last name' do
      user = build(:user, first_name: 'John', last_name: 'Doe')
      expect(user.full_name).to eq('John Doe')
    end

    it 'handles missing last name' do
      user = build(:user, first_name: 'John', last_name: nil)
      expect(user.full_name).to eq('John')
    end
  end

  describe 'callbacks' do
    it 'normalizes email before save' do
      user = create(:user, email: ' JOHN@EXAMPLE.COM ')
      expect(user.email).to eq('john@example.com')
    end
  end
end

# spec/services/user_registration_service_spec.rb
require 'rails_helper'

RSpec.describe UserRegistrationService do
  let(:valid_params) { attributes_for(:user) }

  describe '#call' do
    context 'with valid parameters' do
      it 'creates a user' do
        expect { described_class.new(valid_params).call }
          .to change(User, :count).by(1)
      end

      it 'sends welcome email' do
        expect { described_class.new(valid_params).call }
          .to have_enqueued_job(ActionMailer::MailDeliveryJob)
      end

      it 'creates default settings' do
        service = described_class.new(valid_params)
        service.call

        expect(service.user.user_setting).to be_present
        expect(service.user.user_setting.theme).to eq('light')
      end
    end

    context 'with invalid parameters' do
      let(:invalid_params) { { name: '', email: 'invalid' } }

      it 'does not create user' do
        expect { described_class.new(invalid_params).call }
          .not_to change(User, :count)
      end

      it 'returns false' do
        result = described_class.new(invalid_params).call
        expect(result).to be_falsey
      end

      it 'populates errors' do
        service = described_class.new(invalid_params)
        service.call
        expect(service.errors).not_to be_empty
      end
    end
  end
end
```

## Database Migrations

**Use proper migration structure:**
```ruby
class AddIndexToUsersEmail < ActiveRecord::Migration[7.0]
  def change
    add_index :users, :email, unique: true
  end
end

class CreatePosts < ActiveRecord::Migration[7.0]
  def change
    create_table :posts do |t|
      t.string :title, null: false
      t.text :content
      t.references :user, null: false, foreign_key: true
      t.timestamps
    end

    add_index :posts, :title
    add_index :posts, [:user_id, :created_at]
  end
end
```

## Authentication & Authorization

**Use Devise or similar:**
```ruby
# config/routes.rb
Rails.application.routes.draw do
  devise_for :users, controllers: {
    sessions: 'users/sessions',
    registrations: 'users/registrations'
  }

  resources :posts
end

# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  before_action :authenticate_user!
  before_action :configure_permitted_parameters, if: :devise_controller?

  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:name])
    devise_parameter_sanitizer.permit(:account_update, keys: [:name])
  end
end

# app/policies/post_policy.rb
class PostPolicy < ApplicationPolicy
  def update?
    user.admin? || record.user == user
  end

  def destroy?
    user.admin? || (record.user == user && record.created_at > 1.hour.ago)
  end
end
```

## Background Jobs

**Use ActiveJob with Sidekiq:**
```ruby
# app/jobs/send_notification_job.rb
class SendNotificationJob < ApplicationJob
  queue_as :default

  def perform(user_id, message)
    user = User.find(user_id)
    NotificationService.new(user).send(message)
  rescue ActiveRecord::RecordNotFound
    Rails.logger.warn("User #{user_id} not found for notification")
  end
end

# Usage
SendNotificationJob.perform_later(user.id, "Welcome to our platform!")

# With retry and scheduling
SendNotificationJob.set(wait: 5.minutes).perform_later(user.id, message)
```

## API Development

**Use Rails API mode:**
```ruby
# app/controllers/api/v1/users_controller.rb
module Api
  module V1
    class UsersController < ApplicationController
      skip_before_action :verify_authenticity_token
      before_action :authenticate_api_user!

      def index
        users = User.all.page(params[:page])
        render json: UserSerializer.new(users).serialized_json
      end

      def show
        user = User.find(params[:id])
        render json: UserSerializer.new(user).serialized_json
      end

      def create
        user = User.new(user_params)

        if user.save
          render json: UserSerializer.new(user).serialized_json,
                 status: :created
        else
          render json: { errors: user.errors }, status: :unprocessable_entity
        end
      end
    end
  end
end
```

## Best Practices

### Code Organization
- Use concerns for shared controller logic
- Create custom validators for complex validations
- Use decorators for view logic
- Keep helpers focused and reusable

### Performance
- Use eager loading to prevent N+1 queries
- Implement caching for expensive operations
- Use database indexes appropriately
- Monitor query performance

### Security
- Use strong parameters
- Implement proper authentication
- Validate and sanitize inputs
- Use HTTPS in production

### Testing
- Aim for 90%+ test coverage
- Use factories for test data
- Test edge cases and error conditions
- Keep tests fast and reliable

## Validation Commands

```bash
# Run Rails server
rails server

# Run tests
rails test
# or with RSpec
rspec

# Run specific test
rails test test/models/user_test.rb

# Check code style
rubocop

# Run security checks
brakeman

# Check for vulnerabilities
bundle audit

# Run database migrations
rails db:migrate

# Rollback migration
rails db:rollback
```