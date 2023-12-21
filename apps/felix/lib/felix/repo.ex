defmodule Felix.Repo do
  use Ecto.Repo,
    otp_app: :felix,
    adapter: Ecto.Adapters.Postgres
end
