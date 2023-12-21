defmodule FelixWeb.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      FelixWeb.Telemetry,
      # Start a worker by calling: FelixWeb.Worker.start_link(arg)
      # {FelixWeb.Worker, arg},
      # Start to serve requests, typically the last entry
      FelixWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: FelixWeb.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    FelixWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
